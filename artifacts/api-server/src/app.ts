import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { ensureCatalogueSeeded } from "./lib/seed.js";

const app = express();

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

app.use(async (_req, _res, next) => {
  try {
    await ensureCatalogueSeeded();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api", router);

const errorHandler: express.ErrorRequestHandler = (error, _req, res, _next) => {
  logger.error({ err: error }, "Unhandled API error");
  res.status(500).json({ error: "The service is temporarily unavailable." });
};

app.use(errorHandler);

export default app;
