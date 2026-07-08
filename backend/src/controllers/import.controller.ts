import type { Request, Response } from "express";
import { env } from "../config/env";
import { HttpError } from "../middleware/error.middleware";
import { getLLMProvider } from "../services/ai";
import { parseCsv } from "../services/csv.service";
import { runExtraction, type ExtractionSummary } from "../services/extraction.service";
import { logger } from "../utils/logger";

function requireFile(req: Request): Express.Multer.File {
  const file = req.file;
  if (!file) {
    throw new HttpError(400, "No file uploaded. Attach a .csv file as multipart field 'file'.");
  }
  if (file.buffer.length === 0) {
    throw new HttpError(400, "Uploaded file is empty.");
  }
  return file;
}

/** POST /api/import — buffers the whole pipeline and returns one JSON response. */
export async function importCsv(req: Request, res: Response): Promise<void> {
  const file = requireFile(req);
  const parsed = parseCsv(file.buffer.toString("utf-8"));
  const provider = getLLMProvider();

  const summary: ExtractionSummary = await runExtraction(provider, parsed, {
    batchSize: env.BATCH_SIZE,
    retryAttempts: env.BATCH_RETRY_ATTEMPTS,
  });

  res.status(200).json({ success: true, data: summary });
}

/**
 * POST /api/import/stream — same pipeline, but emits newline-delimited JSON
 * progress events as each batch completes, finishing with a "complete" event.
 * Lets the frontend show real per-batch progress instead of a single spinner.
 */
export async function importCsvStream(req: Request, res: Response): Promise<void> {
  const file = requireFile(req);
  const parsed = parseCsv(file.buffer.toString("utf-8"));
  const provider = getLLMProvider();

  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  const writeLine = (obj: unknown) => res.write(`${JSON.stringify(obj)}\n`);

  try {
    const summary = await runExtraction(provider, parsed, {
      batchSize: env.BATCH_SIZE,
      retryAttempts: env.BATCH_RETRY_ATTEMPTS,
      onProgress: (event) => writeLine(event),
    });
    writeLine({ type: "complete", data: summary });
  } catch (err) {
    logger.error("Streamed import failed", { error: err instanceof Error ? err.stack : err });
    writeLine({
      type: "error",
      message: err instanceof Error ? err.message : "Import failed.",
    });
  } finally {
    res.end();
  }
}
