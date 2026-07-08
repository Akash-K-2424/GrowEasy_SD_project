import type { AiRowExtraction, CrmRecord, SkippedRecord } from "../schemas/crm.schema";
import type { ParsedCsv } from "./csv.service";
import { LLMProviderError, type LLMProvider } from "./ai";
import { normalizeExtraction } from "./normalize.service";
import { chunk } from "../utils/batch";
import { withRetry } from "../utils/retry";
import { logger } from "../utils/logger";

export interface ExtractionProgressEvent {
  type: "progress";
  batchIndex: number;
  totalBatches: number;
  rowsProcessed: number;
  totalRows: number;
  batchFailed?: boolean;
}

export interface ExtractionSummary {
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
}

export interface RunExtractionOptions {
  batchSize: number;
  retryAttempts: number;
  onProgress?: (event: ExtractionProgressEvent) => void;
}

/** A row is only worth keeping if the AI managed to find a way to reach the lead. */
function isSkippable(row: AiRowExtraction): boolean {
  return row.email.trim() === "" && row.mobile_without_country_code.trim() === "";
}

export async function runExtraction(
  provider: LLMProvider,
  parsed: ParsedCsv,
  options: RunExtractionOptions
): Promise<ExtractionSummary> {
  const { headers, rows } = parsed;
  const batches = chunk(rows, options.batchSize);
  const records: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  let rowsProcessed = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batchRows = batches[batchIndex];
    const rowOffset = batchIndex * options.batchSize;
    let batchFailed = false;

    try {
      const extractions = await withRetry(
        async (attempt) => {
          const result = await provider.extractBatch({ headers, rows: batchRows });
          if (result.length !== batchRows.length) {
            throw new LLMProviderError(
              `Provider returned ${result.length} rows for a batch of ${batchRows.length} (attempt ${attempt}).`
            );
          }
          return result;
        },
        { attempts: options.retryAttempts }
      );

      extractions.forEach((extraction, i) => {
        const sourceRow = rowOffset + i + 1;
        const raw = batchRows[i];
        // Deterministically enforce spec rules 3/5/6 on whatever the model
        // returned before deciding the row's fate.
        const normalized = normalizeExtraction(extraction);
        if (isSkippable(normalized)) {
          skipped.push({
            sourceRow,
            reason: "No email or mobile number could be found for this row.",
            raw,
          });
        } else {
          records.push({ ...normalized, sourceRow });
        }
      });
    } catch (err) {
      batchFailed = true;
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Batch extraction failed after retries, skipping batch", {
        batchIndex,
        message,
      });
      batchRows.forEach((raw, i) => {
        skipped.push({
          sourceRow: rowOffset + i + 1,
          reason: `AI extraction failed after ${options.retryAttempts} attempts: ${message}`,
          raw,
        });
      });
    }

    rowsProcessed += batchRows.length;
    options.onProgress?.({
      type: "progress",
      batchIndex: batchIndex + 1,
      totalBatches: batches.length,
      rowsProcessed,
      totalRows: rows.length,
      batchFailed,
    });
  }

  return {
    records,
    skipped,
    totalRows: rows.length,
    totalImported: records.length,
    totalSkipped: skipped.length,
  };
}
