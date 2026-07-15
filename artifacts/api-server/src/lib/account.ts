import { eq, and, isNull, ne } from "drizzle-orm";
import { db, usersTable, type User, type PremiumPlan } from "@workspace/db";
import { DEFAULT_FAVORITE_ASSETS, isValidAssetSymbol } from "./assets";

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
}

const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids ambiguous codes

function generateReferralCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += REFERRAL_CODE_ALPHABET[Math.floor(Math.random() * REFERRAL_CODE_ALPHABET.length)];
  }
  return code;
}

/** JIT-provision a local user record for a Clerk-authenticated request. */
export async function ensureUser(clerkUserId: string): Promise<User> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  if (existing) return existing;

  // Retry on the rare chance of a referral-code collision (unique constraint).
  for (let attempt = 0; attempt < 5; attempt++) {
    const [created] = await db
      .insert(usersTable)
      .values({ clerkUserId, referralCode: generateReferralCode() })
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
  };
}

export type ReferralApplyResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/**
 * Redeems a referral code for a user who hasn't already redeemed one.
 * Rewards the *referrer* (the code's owner) with `REFERRAL_REWARD_DAYS` extra
 * trial days; the referred user themselves gets no separate bonus — the
 * spec only rewards the inviter. Wrapped in a transaction so the "already
 * redeemed" check and both writes (referred user + referrer) are atomic
 * against concurrent redemption attempts.
 */
export async function applyReferral(
  clerkUserId: string,
  code: string,
): Promise<ReferralApplyResult> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { ok: false, error: "Referral code is required" };
  }

  return db.transaction(async (tx) => {
    const [referred] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId));
    if (!referred) {
      return { ok: false, error: "Account not found" };
    }
    if (referred.referredByCode) {
      return { ok: false, error: "Referral already applied to this account" };
    }
    if (referred.referralCode === normalizedCode) {
      return { ok: false, error: "You can't refer yourself" };
    }

    const [referrer] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.referralCode, normalizedCode));
    if (!referrer) {
      return { ok: false, error: "Invalid referral code" };
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
      return { ok: false, error: "Referral already applied to this account" };
    }

    await tx
      .update(usersTable)
      .set({
        referralBonusDays: referrer.referralBonusDays + REFERRAL_REWARD_DAYS,
      })
      .where(
        and(eq(usersTable.id, referrer.id), ne(usersTable.id, referred.id)),
      );

    return { ok: true, user: updatedReferred };
  });
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
