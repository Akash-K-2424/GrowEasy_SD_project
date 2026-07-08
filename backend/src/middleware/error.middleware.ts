import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { CsvParseError } from "../services/csv.service";
import { logger } from "../utils/logger";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: { message: `Not found: ${req.path}` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    // Streaming responses may already have sent partial data.
    res.end();
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, error: { message: err.message } });
    return;
  }
  if (err instanceof CsvParseError) {
    res.status(400).json({ success: false, error: { message: err.message } });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({ success: false, error: { message: err.message } });
    return;
  }
  if (err instanceof Error && err.message.includes("Only .csv files are accepted")) {
    res.status(400).json({ success: false, error: { message: err.message } });
    return;
  }

  logger.error("Unhandled error", { error: err instanceof Error ? err.stack : err });
  res.status(500).json({ success: false, error: { message: "Internal server error." } });
}
