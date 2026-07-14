import { Router, type IRouter } from "express";
import { GetPricesResponse } from "@workspace/api-zod";
import { getSnapshotOrFetch } from "../lib/priceFeed";

const router: IRouter = Router();

router.get("/prices", async (_req, res): Promise<void> => {
  const snapshot = await getSnapshotOrFetch();
  res.json(GetPricesResponse.parse(snapshot));
});

export default router;
