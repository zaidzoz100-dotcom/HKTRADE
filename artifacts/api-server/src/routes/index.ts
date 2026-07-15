import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pricesRouter from "./prices";
import alertsRouter from "./alerts";
import accountRouter from "./account";
import adminRouter from "./admin";
import { startPricePolling } from "../lib/priceFeed";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pricesRouter);
router.use(accountRouter);
router.use(alertsRouter);
router.use(adminRouter);

startPricePolling();

export default router;
