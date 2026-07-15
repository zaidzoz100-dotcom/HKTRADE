import { eq } from "drizzle-orm";
import { db, usersTable, type User, type PremiumPlan } from "@workspace/db";

export type AdminPlanAction =
  | "trial_active"
  | "trial_expired"
  | "monthly_active"
  | "monthly_expired"
  | "yearly_active"
  | "yearly_expired";

export const TRIAL_DAYS = 4;
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
}

/** JIT-provision a local user record for a Clerk-authenticated request. */
export async function ensureUser(clerkUserId: string): Promise<User> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  if (existing) return existing;

  const [created] = await db
    .insert(usersTable)
    .values({ clerkUserId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  // Lost a race with a concurrent request that inserted first.
  const [raced] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  if (!raced) {
    throw new Error(`Failed to provision user ${clerkUserId}`);
  }
  return raced;
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
    };
  }

  const trialStartedAt = user.trialStartedAt ?? user.createdAt;
  const trialEndsAt = new Date(
    trialStartedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
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
  };
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
