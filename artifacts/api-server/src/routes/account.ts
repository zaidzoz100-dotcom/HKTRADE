import { Router, type IRouter } from "express";
import {
  GetAccountResponse,
  UpdateFavoriteAssetsBody,
  UpdateFavoriteAssetsResponse,
  ApplyReferralBody,
  ApplyReferralResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { ensureUser, computeAccountStatus, updateFavoriteAssets, applyReferral } from "../lib/account";

const router: IRouter = Router();

router.get("/account", requireAuth, async (req, res): Promise<void> => {
  const user = await ensureUser(req.userId!);
  res.json(GetAccountResponse.parse(computeAccountStatus(user)));
});

router.post("/account/referral", requireAuth, async (req, res): Promise<void> => {
  const body = ApplyReferralBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  await ensureUser(req.userId!);
  const result = await applyReferral(req.userId!, body.data.code);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(ApplyReferralResponse.parse(computeAccountStatus(result.user)));
});

router.patch("/account/favorites", requireAuth, async (req, res): Promise<void> => {
  const body = UpdateFavoriteAssetsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    await ensureUser(req.userId!);
    const updated = await updateFavoriteAssets(req.userId!, body.data.favoriteAssets);
    res.json(UpdateFavoriteAssetsResponse.parse(computeAccountStatus(updated)));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
