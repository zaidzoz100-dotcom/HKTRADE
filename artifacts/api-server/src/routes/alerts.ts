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

  const [alert] = await db
    .insert(alertsTable)
    .values({
      clerkUserId: req.userId!,
      assetSymbol: parsed.data.assetSymbol,
      assetLabel: parsed.data.assetLabel,
      targetPrice: parsed.data.targetPrice,
      direction: parsed.data.direction,
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
