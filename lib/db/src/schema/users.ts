import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

/** Manually-managed subscription plan, set by the admin panel. */
export const PREMIUM_PLANS = ["trial", "monthly", "yearly"] as const;
export type PremiumPlan = (typeof PREMIUM_PLANS)[number];

/** The original 5-asset lineup, used when a user hasn't customized their dashboard yet. */
export const DEFAULT_FAVORITE_ASSETS = [
  "XAU",
  "XAG",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
] as const;

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
  /** User-selected asset symbols shown as market cards on the dashboard. Null/empty means "use the default lineup". */
  favoriteAssets: jsonb("favorite_assets").$type<string[]>(),
  /** This user's own shareable referral code — generated once at account creation. */
  referralCode: text("referral_code").notNull().unique(),
  /** The referral code this user signed up with, if any. Null means they weren't referred, or haven't redeemed one yet. Set at most once. */
  referredByCode: text("referred_by_code"),
  /** Extra trial days earned by successfully referring other users (4 per referral); added on top of TRIAL_DAYS when computing this user's trial window. */
  referralBonusDays: integer("referral_bonus_days").notNull().default(0),
});

export type User = typeof usersTable.$inferSelect;
