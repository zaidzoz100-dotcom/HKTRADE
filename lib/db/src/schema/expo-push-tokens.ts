import { pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * One row per device that registered an Expo push token (mobile app only).
 * Distinct from `push_subscriptions` (Web Push endpoint+keys) because Expo
 * tokens are a single opaque string issued by Expo's push service, not a
 * browser PushSubscription — the two delivery mechanisms are sent to
 * independently so a user can receive alerts on both web and mobile.
 */
export const expoPushTokensTable = pgTable(
  "expo_push_tokens",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.token)],
);

export type ExpoPushToken = typeof expoPushTokensTable.$inferSelect;
