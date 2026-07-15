import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

/** Manually-managed subscription plan, set by the admin panel. */
export const PREMIUM_PLANS = ["trial", "monthly", "yearly"] as const;
export type PremiumPlan = (typeof PREMIUM_PLANS)[number];

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumGrantedAt: timestamp("premium_granted_at", { withTimezone: true }),
  /** "trial" | "monthly" | "yearly" — set by the admin panel. */
  plan: text("plan").notNull().default("trial"),
  /** Start of the free trial window; reset by the admin to grant/revoke trial access. */
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** Expiry for monthly/yearly plans, set by the admin panel. Null while on trial. */
  premiumExpiresAt: timestamp("premium_expires_at", { withTimezone: true }),
});

export type User = typeof usersTable.$inferSelect;
