import type { AiRowExtraction } from "../../schemas/crm.schema";

export interface ExtractBatchInput {
  headers: string[];
  rows: Record<string, string>[];
}

export interface LLMProvider {
  readonly name: string;
  /**
   * Maps a batch of raw CSV rows to CRM fields. Must return exactly one
   * extraction per input row, in the same order, so callers can zip the
   * result back against the original row for skip-rule enforcement and
   * error reporting.
   */
  extractBatch(input: ExtractBatchInput): Promise<AiRowExtraction[]>;
}

export class LLMProviderError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "LLMProviderError";
  }
}

/** Thrown when the selected LLM_PROVIDER is missing its required API key.
 * A deployment/config mistake, not a per-request failure -- surfaced to the
 * client as a clear 503 instead of a generic "Internal server error". */
export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}
