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
// pushRouter must come before alertsRouter/adminRouter: those routers apply
// `router.use(requireAuth)` unscoped to a path, which — since Express matches
// unscoped `.use` middleware against every request that reaches that router,
// not just its own routes — would otherwise block push's public
// vapid-public-key endpoint (and anything else mounted after them) for
// unauthenticated requests.
router.use(pushRouter);
router.use(alertsRouter);
router.use(adminRouter);

startPricePolling();

export default router;
