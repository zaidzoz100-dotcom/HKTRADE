import { pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * One row per subscribed browser/device for a user. A user can have several
 * (e.g. desktop + phone); each is pushed to independently and pruned
 * individually if the push service reports it as gone (404/410).
 */
export const pushSubscriptionsTable = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.endpoint)],
);

export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;
