import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, alertsTable } from "@workspace/db";
import {
  CreateAlertBody,
  UpdateAlertParams,
  UpdateAlertBody,
  DeleteAlertParams,
  AcknowledgeAlertParams,
  ListAlertsResponse,
  CreateAlertResponse,
  UpdateAlertResponse,
  AcknowledgeAlertResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { ensureUser, computeAccountStatus, CONTACT_ADMIN_URL } from "../lib/account";
import { getSnapshotOrFetch } from "../lib/priceFeed";

/**
 * The client no longer asks the user to pick a trigger direction — an alert
 * should just fire whenever the price reaches the target, from either side.
 * We derive the direction we store from where the price currently sits
 * relative to the target: if the target is above the current price, the
 * price needs to rise to reach it ("above"); if it's below or equal, the
 * price needs to fall ("below").
 *
 * We also return the live price as `baselinePrice` so the caller can persist
 * it alongside the alert. checkAlerts uses it to require a genuine crossing
 * (i.e. price was on the opposite side of the target at creation time) before
 * firing, which prevents immediate false-positive triggers when the target is
 * set at or very near the current price.
 */
async function inferDirectionAndBaseline(
  assetSymbol: string,
  targetPrice: number,
): Promise<{ direction: "above" | "below"; baselinePrice: number | null }> {
  const snapshot = await getSnapshotOrFetch();
  const currentPrice =
    snapshot.metals.find((m) => m.symbol === assetSymbol)?.price ??
    snapshot.forex.find((f) => f.pair === assetSymbol)?.rate ??
    snapshot.crypto.find((c) => c.symbol === assetSymbol)?.price ??
    null;

  if (currentPrice === null) return { direction: "above", baselinePrice: null };
  // Use strict < so that target == current → "below", meaning the price must
  // rise away from the target and then fall back to it (or fall further) before
  // triggering. This prevents an immediate fire when the target equals the
  // live price.
  const direction = targetPrice < currentPrice ? "below" : "above";
  return { direction, baselinePrice: currentPrice };
}

const router: IRouter = Router();

router.use(requireAuth);

router.get("/alerts", async (req, res): Promise<void> => {
  const alerts = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.clerkUserId, req.userId!))
    .orderBy(alertsTable.createdAt);
  res.json(ListAlertsResponse.parse(alerts));
});

router.get("/alerts/triggered", async (req, res): Promise<void> => {
  const alerts = await db
    .select()
    .from(alertsTable)
    .where(
      and(
        eq(alertsTable.clerkUserId, req.userId!),
        eq(alertsTable.status, "triggered"),
      ),
    );
  res.json(ListAlertsResponse.parse(alerts));
});

router.post("/alerts", async (req, res): Promise<void> => {
  const parsed = CreateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = await ensureUser(req.userId!);
  const { canCreateAlerts } = computeAccountStatus(user);
  if (!canCreateAlerts) {
    res.status(403).json({
      error:
        "Your free trial has ended. Upgrade to Premium to keep creating alerts.",
      contactUrl: CONTACT_ADMIN_URL,
    });
    return;
  }

  const { direction, baselinePrice } = await inferDirectionAndBaseline(
    parsed.data.assetSymbol,
    parsed.data.targetPrice,
  );

  const [alert] = await db
    .insert(alertsTable)
    .values({
      clerkUserId: req.userId!,
      assetSymbol: parsed.data.assetSymbol,
      assetLabel: parsed.data.assetLabel,
      targetPrice: parsed.data.targetPrice,
      direction,
      baselinePrice,
      note: parsed.data.note ?? null,
    })
    .returning();

  res.status(201).json(CreateAlertResponse.parse(alert));
});

router.patch("/alerts/:id", async (req, res): Promise<void> => {
  const params = UpdateAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const update: Partial<typeof alertsTable.$inferInsert> = {};
  if (parsed.data.targetPrice !== undefined)
    update.targetPrice = parsed.data.targetPrice;
  if (parsed.data.direction !== undefined)
    update.direction = parsed.data.direction;
  if (parsed.data.note !== undefined) update.note = parsed.data.note;
  if (parsed.data.status !== undefined) update.status = parsed.data.status;

  const [alert] = await db
    .update(alertsTable)
    .set(update)
    .where(
      and(
        eq(alertsTable.id, params.data.id),
        eq(alertsTable.clerkUserId, req.userId!),
      ),
    )
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(UpdateAlertResponse.parse(alert));
});

router.delete("/alerts/:id", async (req, res): Promise<void> => {
  const params = DeleteAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alert] = await db
    .delete(alertsTable)
    .where(
      and(
        eq(alertsTable.id, params.data.id),
        eq(alertsTable.clerkUserId, req.userId!),
      ),
    )
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/alerts/:id/acknowledge", async (req, res): Promise<void> => {
  const params = AcknowledgeAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alert] = await db
    .update(alertsTable)
    .set({ status: "acknowledged", acknowledgedAt: new Date() })
    .where(
      and(
        eq(alertsTable.id, params.data.id),
        eq(alertsTable.clerkUserId, req.userId!),
      ),
    )
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(AcknowledgeAlertResponse.parse(alert));
});

export default router;
