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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({
  id: true,
  createdAt: true,
  triggeredAt: true,
  acknowledgedAt: true,
});
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
