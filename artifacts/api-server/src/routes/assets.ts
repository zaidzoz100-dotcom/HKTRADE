import { Router, type IRouter } from "express";
import { GetAssetsResponse } from "@workspace/api-zod";
import { ALL_ASSETS } from "../lib/assets";

const router: IRouter = Router();

router.get("/assets", async (_req, res): Promise<void> => {
  res.json(GetAssetsResponse.parse(ALL_ASSETS));
});

export default router;
