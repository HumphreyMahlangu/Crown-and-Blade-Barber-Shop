import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { ensureCatalogueSeeded } from "./lib/seed.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await ensureCatalogueSeeded();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api", router);

app.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err: error }, "Unhandled API error");
    res.status(500).json({ error: "The service is temporarily unavailable." });
  },
);

export default app;
