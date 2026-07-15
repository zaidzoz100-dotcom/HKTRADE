import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";

export const TRIAL_DAYS = 4;
export const CONTACT_ADMIN_URL = "https://t.me/hackedtrad";

export interface AccountStatus {
  isPremium: boolean;
  trialStartedAt: string;
  trialEndsAt: string;
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

export function computeAccountStatus(user: User): AccountStatus {
  const trialStartedAt = user.createdAt;
  const trialEndsAt = new Date(
    trialStartedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
  );
  const now = new Date();
  const msRemaining = trialEndsAt.getTime() - now.getTime();
  const daysRemaining = user.isPremium
    ? 0
    : Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
  const inTrial = !user.isPremium && msRemaining > 0;

  return {
    isPremium: user.isPremium,
    trialStartedAt: trialStartedAt.toISOString(),
    trialEndsAt: trialEndsAt.toISOString(),
    daysRemaining,
    canCreateAlerts: user.isPremium || inTrial,
  };
}
