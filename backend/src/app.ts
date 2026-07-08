import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { importRouter } from "./routes/import.routes";

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok", provider: env.LLM_PROVIDER } });
  });

  app.use("/api/import", importRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
