import { Router, type IRouter } from "express";
import { GetAccountResponse, UpdateFavoriteAssetsBody, UpdateFavoriteAssetsResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { ensureUser, computeAccountStatus, updateFavoriteAssets } from "../lib/account";

const router: IRouter = Router();

router.get("/account", requireAuth, async (req, res): Promise<void> => {
  const user = await ensureUser(req.userId!);
  res.json(GetAccountResponse.parse(computeAccountStatus(user)));
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
