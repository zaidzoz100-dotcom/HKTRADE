import { Router, type IRouter } from "express";
import { GetAccountResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { ensureUser, computeAccountStatus } from "../lib/account";

const router: IRouter = Router();

router.get("/account", requireAuth, async (req, res): Promise<void> => {
  const user = await ensureUser(req.userId!);
  res.json(GetAccountResponse.parse(computeAccountStatus(user)));
});

export default router;
