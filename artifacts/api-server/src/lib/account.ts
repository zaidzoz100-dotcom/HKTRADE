import { eq, and, isNull, ne } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, usersTable, type User, type PremiumPlan } from "@workspace/db";
import { DEFAULT_FAVORITE_ASSETS, isValidAssetSymbol } from "./assets";
import { isValidPhoneForCountry } from "@workspace/api-zod";
import { logger } from "./logger";

export type AdminPlanAction =
  | "trial_active"
  | "trial_expired"
  | "monthly_active"
  | "monthly_expired"
  | "yearly_active"
  | "yearly_expired";

export const TRIAL_DAYS = 4;
export const REFERRAL_REWARD_DAYS = 4;
export const CONTACT_ADMIN_URL = "https://t.me/hackedtrad";

export interface AccountStatus {
  isPremium: boolean;
  plan: PremiumPlan;
  planStatus: "active" | "expired";
  trialStartedAt: string;
  trialEndsAt: string;
  premiumExpiresAt: string | null;
  daysRemaining: number;
  canCreateAlerts: boolean;
  favoriteAssets: string[];
  referralCode: string;
  referredByCode: string | null;
  referralBonusDays: number;
  isEmailVerified: boolean;
  profileComplete: boolean;
  country: string | null;
  phoneNumber: string | null;
}

const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids ambiguous codes

function generateReferralCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += REFERRAL_CODE_ALPHABET[Math.floor(Math.random() * REFERRAL_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Looks up whether Clerk considers this user's primary email address
 * verified. Email/password sign-ups already require verification before
 * Clerk grants a session, and OAuth providers (Google/GitHub/etc.)
 * pre-verify the email themselves — so this is normally `true` by the time
 * we ever see a request for this user. It's still checked explicitly
 * (rather than assumed) so referral-reward gating is based on Clerk's real
 * state, not on an assumption about the sign-up flow.
 */
async function isClerkEmailVerified(clerkUserId: string): Promise<boolean> {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    return primaryEmail?.verification?.status === "verified";
  } catch (err) {
    logger.error({ err, clerkUserId }, "Failed to check Clerk email verification status");
    return false;
  }
}

/** JIT-provision a local user record for a Clerk-authenticated request. */
export async function ensureUser(clerkUserId: string): Promise<User> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  if (existing) {
    // Best-effort resync: if we haven't yet recorded this account as
    // verified, re-check Clerk. Cheap because it only fires for the
    // (normally brief) window before verification is confirmed.
    if (!existing.isEmailVerified) {
      return await refreshEmailVerification(existing);
    }
    return existing;
  }

  const isEmailVerified = await isClerkEmailVerified(clerkUserId);

  // Retry on the rare chance of a referral-code collision (unique constraint).
  for (let attempt = 0; attempt < 5; attempt++) {
    const [created] = await db
      .insert(usersTable)
      .values({ clerkUserId, referralCode: generateReferralCode(), isEmailVerified })
      .onConflictDoNothing()
      .returning();
    if (created) return created;

    // Either another request inserted this clerkUserId first, or we collided
    // on referralCode. Check which — if the user now exists, return it.
    const [raced] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId));
    if (raced) return raced;
  }

  throw new Error(`Failed to provision user ${clerkUserId}`);
}

/** Re-checks Clerk and persists `isEmailVerified` if it has flipped to true. */
async function refreshEmailVerification(user: User): Promise<User> {
  const verifiedNow = await isClerkEmailVerified(user.clerkUserId);
  if (!verifiedNow) return user;

  const [updated] = await db
    .update(usersTable)
    .set({ isEmailVerified: true })
    .where(eq(usersTable.id, user.id))
    .returning();
  const result = updated ?? user;
  await maybeGrantReferralReward(result);
  return result;
}

/**
 * Derives the account's live status from the admin-managed `plan` and, for
 * paid plans, `premiumExpiresAt`. The stored `isPremium` column is kept in
 * sync by the admin routes for readability in the database, but is never
 * trusted directly here — status is always recomputed from `plan` so it
 * naturally flips to "expired" once a paid plan lapses.
 */
export function computeAccountStatus(user: User): AccountStatus {
  const now = new Date();
  const plan = (user.plan as PremiumPlan) ?? "trial";

  const favoriteAssets =
    user.favoriteAssets && user.favoriteAssets.length > 0
      ? user.favoriteAssets
      : [...DEFAULT_FAVORITE_ASSETS];

  const referralCode = user.referralCode;
  const referredByCode = user.referredByCode ?? null;
  const referralBonusDays = user.referralBonusDays ?? 0;
  const isEmailVerified = user.isEmailVerified;
  const profileComplete = !!user.profileCompletedAt;
  const country = user.country ?? null;
  const phoneNumber = user.phoneNumber ?? null;

  if (plan === "monthly" || plan === "yearly") {
    const active =
      !!user.premiumExpiresAt && user.premiumExpiresAt.getTime() > now.getTime();
    const trialStartedAt = user.trialStartedAt ?? user.createdAt;
    return {
      isPremium: active,
      plan,
      planStatus: active ? "active" : "expired",
      trialStartedAt: trialStartedAt.toISOString(),
      trialEndsAt: new Date(
        trialStartedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
      premiumExpiresAt: user.premiumExpiresAt
        ? user.premiumExpiresAt.toISOString()
        : null,
      daysRemaining: 0,
      canCreateAlerts: active,
      favoriteAssets,
      referralCode,
      referredByCode,
      referralBonusDays,
      isEmailVerified,
      profileComplete,
      country,
      phoneNumber,
    };
  }

  const trialStartedAt = user.trialStartedAt ?? user.createdAt;
  const trialEndsAt = new Date(
    trialStartedAt.getTime() + (TRIAL_DAYS + referralBonusDays) * 24 * 60 * 60 * 1000,
  );
  const msRemaining = trialEndsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
  const inTrial = msRemaining > 0;

  return {
    isPremium: false,
    plan: "trial",
    planStatus: inTrial ? "active" : "expired",
    trialStartedAt: trialStartedAt.toISOString(),
    trialEndsAt: trialEndsAt.toISOString(),
    premiumExpiresAt: null,
    daysRemaining,
    canCreateAlerts: inTrial,
    favoriteAssets,
    referralCode,
    referredByCode,
    referralBonusDays,
    isEmailVerified,
    profileComplete,
    country,
    phoneNumber,
  };
}

/**
 * Pays out the deferred referral reward — extra trial days for the
 * *referrer* — the moment this user satisfies both required conditions:
 * verified email and a completed registration profile. Idempotent via
 * `referralRewardGranted`, since either `applyReferral` (redeeming a code)
 * or `completeProfile`/verification-resync can be the one to complete the
 * last missing condition, in either order.
 */
async function maybeGrantReferralReward(user: User): Promise<void> {
  if (!user.referredByCode) return;
  if (user.referralRewardGranted) return;
  if (!user.isEmailVerified) return;
  if (!user.profileCompletedAt) return;

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id));
    if (!current || current.referralRewardGranted || !current.referredByCode) return;

    const [referrer] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.referralCode, current.referredByCode));
    if (!referrer) return;

    await tx
      .update(usersTable)
      .set({ referralRewardGranted: true })
      .where(and(eq(usersTable.id, current.id), eq(usersTable.referralRewardGranted, false)));

    await tx
      .update(usersTable)
      .set({ referralBonusDays: referrer.referralBonusDays + REFERRAL_REWARD_DAYS })
      .where(and(eq(usersTable.id, referrer.id), ne(usersTable.id, current.id)));
  });
}

export type ReferralApplyResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/**
 * Redeems a referral code for a user who hasn't already redeemed one.
 * This only *records* the redemption (`referredByCode`) — the referrer's
 * `REFERRAL_REWARD_DAYS` bonus is paid out separately by
 * `maybeGrantReferralReward`, once this user's email is verified AND their
 * registration profile (country/phone) is complete. That way a fake or
 * throwaway signup can capture a code but never actually pays out until the
 * account clears both anti-fraud gates. Wrapped in a transaction so the
 * "already redeemed" check and the write are atomic against concurrent
 * redemption attempts.
 */
export async function applyReferral(
  clerkUserId: string,
  code: string,
): Promise<ReferralApplyResult> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { ok: false, error: "Referral code is required" };
  }

  const result = await db.transaction(async (tx) => {
    const [referred] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId));
    if (!referred) {
      return { ok: false, error: "Account not found" } as ReferralApplyResult;
    }
    if (referred.referredByCode) {
      return { ok: false, error: "Referral already applied to this account" } as ReferralApplyResult;
    }
    if (referred.referralCode === normalizedCode) {
      return { ok: false, error: "You can't refer yourself" } as ReferralApplyResult;
    }

    const [referrer] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.referralCode, normalizedCode));
    if (!referrer) {
      return { ok: false, error: "Invalid referral code" } as ReferralApplyResult;
    }

    const [updatedReferred] = await tx
      .update(usersTable)
      .set({ referredByCode: normalizedCode })
      .where(
        and(eq(usersTable.id, referred.id), isNull(usersTable.referredByCode)),
      )
      .returning();
    if (!updatedReferred) {
      // Lost a race with a concurrent redemption on the same account.
      return { ok: false, error: "Referral already applied to this account" } as ReferralApplyResult;
    }

    return { ok: true, user: updatedReferred } as ReferralApplyResult;
  });

  // Outside the transaction: in the (unusual) case a user completes their
  // profile and verifies email *before* redeeming a code, pay out
  // immediately instead of waiting for a completeProfile call that already
  // happened.
  if (result.ok) {
    await maybeGrantReferralReward(result.user);
  }

  return result;
}

/**
 * Persists a user's chosen market-card lineup. Validates every symbol
 * against the known asset catalog and requires at least one selection, so
 * the dashboard is never left with an empty grid.
 */
export async function updateFavoriteAssets(
  clerkUserId: string,
  favoriteAssets: string[],
): Promise<User> {
  const unique = Array.from(new Set(favoriteAssets));
  if (unique.length === 0) {
    throw new Error("Select at least one asset");
  }
  const invalid = unique.filter((s) => !isValidAssetSymbol(s));
  if (invalid.length > 0) {
    throw new Error(`Unknown asset symbol(s): ${invalid.join(", ")}`);
  }

  const [updated] = await db
    .update(usersTable)
    .set({ favoriteAssets: unique })
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .returning();

  if (!updated) {
    throw new Error(`User ${clerkUserId} not found`);
  }
  return updated;
}

export type CompleteProfileResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/**
 * Records the mandatory registration profile (country + phone number).
 * Validates the phone number actually matches the selected country's dial
 * code so this can't be trivially satisfied with junk data. Once saved,
 * checks whether a pending referral reward can now be paid out.
 */
export async function completeProfile(
  clerkUserId: string,
  country: string,
  phoneNumber: string,
): Promise<CompleteProfileResult> {
  if (!isValidPhoneForCountry(country, phoneNumber)) {
    return {
      ok: false,
      error: "Phone number doesn't match the selected country's dial code",
    };
  }

  const [updated] = await db
    .update(usersTable)
    .set({ country, phoneNumber, profileCompletedAt: new Date() })
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .returning();

  if (!updated) {
    return { ok: false, error: "Account not found" };
  }

  await maybeGrantReferralReward(updated);

  return { ok: true, user: updated };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PAST_EXPIRY = new Date(0); // 1970 — always in the past, marks a plan as expired

/**
 * Applies an admin-panel action to a user's manually-managed plan/status.
 * Every account-status field (isPremium included) is then re-derived from
 * `computeAccountStatus`, so premium unlocks/revokes take effect immediately
 * on the user's very next request — there is no caching to invalidate.
 */
export async function applyAdminPlanAction(
  clerkUserId: string,
  action: AdminPlanAction,
): Promise<User> {
  const now = new Date();
  const update: Partial<typeof usersTable.$inferInsert> = {};

  switch (action) {
    case "trial_active":
      update.plan = "trial";
      update.trialStartedAt = now;
      update.premiumExpiresAt = null;
      update.isPremium = false;
      break;
    case "trial_expired":
      update.plan = "trial";
      update.trialStartedAt = new Date(now.getTime() - (TRIAL_DAYS + 1) * DAY_MS);
      update.premiumExpiresAt = null;
      update.isPremium = false;
      break;
    case "monthly_active":
      update.plan = "monthly";
      update.premiumExpiresAt = new Date(now.getTime() + 30 * DAY_MS);
      update.premiumGrantedAt = now;
      update.isPremium = true;
      break;
    case "monthly_expired":
      update.plan = "monthly";
      update.premiumExpiresAt = PAST_EXPIRY;
      update.isPremium = false;
      break;
    case "yearly_active":
      update.plan = "yearly";
      update.premiumExpiresAt = new Date(now.getTime() + 365 * DAY_MS);
      update.premiumGrantedAt = now;
      update.isPremium = true;
      break;
    case "yearly_expired":
      update.plan = "yearly";
      update.premiumExpiresAt = PAST_EXPIRY;
      update.isPremium = false;
      break;
  }

  const [updated] = await db
    .update(usersTable)
    .set(update)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .returning();

  if (!updated) {
    throw new Error(`User ${clerkUserId} not found`);
  }
  return updated;
}
