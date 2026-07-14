import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pricesRouter from "./prices";
import alertsRouter from "./alerts";
import { startPricePolling } from "../lib/priceFeed";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pricesRouter);
router.use(alertsRouter);

startPricePolling();

export default router;
