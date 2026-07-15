import { Router, type IRouter } from "express";
import {
  GetPushVapidPublicKeyResponse,
  SubscribePushBody,
  UnsubscribePushBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getVapidPublicKey, saveSubscription, removeSubscription } from "../lib/push";

const router: IRouter = Router();

router.get("/push/vapid-public-key", async (_req, res): Promise<void> => {
  res.json(GetPushVapidPublicKeyResponse.parse({ publicKey: getVapidPublicKey() }));
});

router.post("/push/subscribe", requireAuth, async (req, res): Promise<void> => {
  const body = SubscribePushBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await saveSubscription(req.userId!, body.data);
  res.sendStatus(204);
});

router.post("/push/unsubscribe", requireAuth, async (req, res): Promise<void> => {
  const body = UnsubscribePushBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await removeSubscription(body.data.endpoint);
  res.sendStatus(204);
});

export default router;
