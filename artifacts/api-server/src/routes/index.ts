import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import barbershopRouter from "./barbershop.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(barbershopRouter);

export default router;
