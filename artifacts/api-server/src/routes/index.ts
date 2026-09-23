import { Router, type IRouter } from "express";
import healthRouter from "./health";
import barbershopRouter from "./barbershop";

const router: IRouter = Router();

router.use(healthRouter);
router.use(barbershopRouter);

export default router;
