import {
  pgTable,
  serial,
  text,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  assetSymbol: text("asset_symbol").notNull(),
  assetLabel: text("asset_label").notNull(),
  targetPrice: doublePrecision("target_price").notNull(),
  direction: text("direction", { enum: ["above", "below"] }).notNull(),
  status: text("status", {
    enum: ["active", "triggered", "acknowledged", "disabled"],
  })
    .notNull()
    .default("active"),
  note: text("note"),
  // Price of the asset at the moment the alert was created. Used to verify
  // a true price *crossing* before triggering — prevents false positives when
  // the target is set at or very near the live price.
  baselinePrice: doublePrecision("baseline_price"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({
  id: true,
  clerkUserId: true,
  createdAt: true,
  triggeredAt: true,
  acknowledgedAt: true,
});
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
