import { describe, expect, it, vi } from "vitest";
import { runExtraction } from "../src/services/extraction.service";
import type { AiRowExtraction } from "../src/schemas/crm.schema";
import type { LLMProvider } from "../src/services/ai/types";
import type { ParsedCsv } from "../src/services/csv.service";

function blankExtraction(overrides: Partial<AiRowExtraction> = {}): AiRowExtraction {
  return {
    created_at: "",
    name: "",
    email: "",
    country_code: "",
    mobile_without_country_code: "",
    company: "",
    city: "",
    state: "",
    country: "",
    lead_owner: "",
    crm_status: "",
    crm_note: "",
    data_source: "",
    possession_time: "",
    description: "",
    ...overrides,
  };
}

function csvOf(rows: Record<string, string>[]): ParsedCsv {
  return { headers: Object.keys(rows[0]), rows };
}

describe("runExtraction", () => {
  it("keeps rows with an email or mobile, skips rows with neither", async () => {
    const provider: LLMProvider = {
      name: "fake",
      extractBatch: vi.fn().mockResolvedValue([
        blankExtraction({ name: "John", email: "john@x.com" }),
        blankExtraction({ name: "No Contact" }),
        blankExtraction({ name: "Jane", mobile_without_country_code: "9876543210" }),
      ]),
    };

    const parsed = csvOf([
      { name: "John", email: "john@x.com" },
      { name: "No Contact" },
      { name: "Jane", mobile: "9876543210" },
    ]);

    const summary = await runExtraction(provider, parsed, { batchSize: 25, retryAttempts: 3 });

    expect(summary.totalRows).toBe(3);
    expect(summary.totalImported).toBe(2);
    expect(summary.totalSkipped).toBe(1);
    expect(summary.skipped[0].reason).toMatch(/no email or mobile/i);
    expect(summary.records.map((r) => r.name)).toEqual(["John", "Jane"]);
  });

  it("splits rows into multiple batches according to batchSize", async () => {
    const extractBatch = vi.fn().mockImplementation(async ({ rows }) =>
      rows.map(() => blankExtraction({ email: "x@x.com" }))
    );
    const provider: LLMProvider = { name: "fake", extractBatch };

    const parsed = csvOf(Array.from({ length: 5 }, (_, i) => ({ name: `Row ${i}` })));

    await runExtraction(provider, parsed, { batchSize: 2, retryAttempts: 3 });

    expect(extractBatch).toHaveBeenCalledTimes(3); // 2 + 2 + 1
  });

  it("retries a failing batch and succeeds within the retry budget", async () => {
    const extractBatch = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce([blankExtraction({ email: "ok@x.com" })]);
    const provider: LLMProvider = { name: "fake", extractBatch };

    const parsed = csvOf([{ name: "Row" }]);
    const summary = await runExtraction(provider, parsed, { batchSize: 25, retryAttempts: 3 });

    expect(extractBatch).toHaveBeenCalledTimes(2);
    expect(summary.totalImported).toBe(1);
  });

  it("skips an entire batch with a clear reason once retries are exhausted", async () => {
    const extractBatch = vi.fn().mockRejectedValue(new Error("provider down"));
    const provider: LLMProvider = { name: "fake", extractBatch };

    const parsed = csvOf([{ name: "A" }, { name: "B" }]);
    const summary = await runExtraction(provider, parsed, { batchSize: 25, retryAttempts: 2 });

    expect(extractBatch).toHaveBeenCalledTimes(2);
    expect(summary.totalSkipped).toBe(2);
    expect(summary.skipped.every((s) => s.reason.includes("provider down"))).toBe(true);
  });

  it("treats a length-mismatched provider response as a failure and retries", async () => {
    const extractBatch = vi
      .fn()
      .mockResolvedValueOnce([blankExtraction()]) // wrong length for a 2-row batch
      .mockResolvedValueOnce([
        blankExtraction({ email: "a@x.com" }),
        blankExtraction({ email: "b@x.com" }),
      ]);
    const provider: LLMProvider = { name: "fake", extractBatch };

    const parsed = csvOf([{ name: "A" }, { name: "B" }]);
    const summary = await runExtraction(provider, parsed, { batchSize: 25, retryAttempts: 3 });

    expect(extractBatch).toHaveBeenCalledTimes(2);
    expect(summary.totalImported).toBe(2);
  });

  it("applies spec-rule normalization to whatever the provider returns", async () => {
    const provider: LLMProvider = {
      name: "fake",
      extractBatch: vi.fn().mockResolvedValue([
        blankExtraction({
          name: "Messy",
          email: "a@x.com, b@y.com",
          mobile_without_country_code: "+91 98765 43210 / 9123456789",
          created_at: "25/12/2026",
          crm_note: "line one\nline two",
        }),
      ]),
    };

    const parsed = csvOf([{ anything: "row" }]);
    const summary = await runExtraction(provider, parsed, { batchSize: 25, retryAttempts: 1 });

    const record = summary.records[0];
    expect(record.email).toBe("a@x.com");
    expect(record.crm_note).toContain("b@y.com");
    expect(record.mobile_without_country_code).toBe("9876543210");
    expect(record.country_code).toBe("+91");
    expect(record.crm_note).toContain("9123456789");
    expect(Number.isNaN(new Date(record.created_at).getTime())).toBe(false);
    expect(record.crm_note).not.toMatch(/\n/);
  });

  it("skips a row whose only 'contact' data is unusable garbage", async () => {
    const provider: LLMProvider = {
      name: "fake",
      extractBatch: vi.fn().mockResolvedValue([
        blankExtraction({ name: "Junk", email: "not-an-email", mobile_without_country_code: "N/A" }),
      ]),
    };

    const parsed = csvOf([{ anything: "row" }]);
    const summary = await runExtraction(provider, parsed, { batchSize: 25, retryAttempts: 1 });

    expect(summary.totalSkipped).toBe(1);
    expect(summary.totalImported).toBe(0);
  });

  it("reports progress after every batch with cumulative row counts", async () => {
    const extractBatch = vi.fn().mockImplementation(async ({ rows }) =>
      rows.map(() => blankExtraction({ email: "x@x.com" }))
    );
    const provider: LLMProvider = { name: "fake", extractBatch };
    const onProgress = vi.fn();

    const parsed = csvOf(Array.from({ length: 5 }, (_, i) => ({ name: `Row ${i}` })));
    await runExtraction(provider, parsed, { batchSize: 2, retryAttempts: 3, onProgress });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ batchIndex: 3, totalBatches: 3, rowsProcessed: 5, totalRows: 5 })
    );
  });
});
