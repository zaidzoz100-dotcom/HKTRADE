import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pricesRouter from "./prices";
import assetsRouter from "./assets";
import alertsRouter from "./alerts";
import accountRouter from "./account";
import adminRouter from "./admin";
import pushRouter from "./push";
import { startPricePolling } from "../lib/priceFeed";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pricesRouter);
router.use(assetsRouter);
router.use(accountRouter);
router.use(alertsRouter);
router.use(adminRouter);
router.use(pushRouter);

startPricePolling();

export default router;
