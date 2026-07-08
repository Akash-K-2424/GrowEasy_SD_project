import Papa from "papaparse";

export class CsvParseError extends Error {}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parses arbitrary CSV content into header + row records without assuming
 * any fixed column names. Blank rows and fully-empty columns are dropped so
 * the AI never has to reason about padding artifacts from spreadsheet exports.
 */
export function parseCsv(fileContent: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    transform: (value) => (typeof value === "string" ? value.trim() : value),
  });

  if (result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type !== "FieldMismatch");
    if (fatal) {
      throw new CsvParseError(`Failed to parse CSV: ${fatal.message}`);
    }
  }

  const headers = (result.meta.fields ?? []).filter((h) => h.length > 0);
  if (headers.length === 0) {
    throw new CsvParseError("CSV file has no recognizable header row.");
  }

  const rows = result.data.filter((row) =>
    Object.values(row).some((v) => typeof v === "string" && v.length > 0)
  );

  if (rows.length === 0) {
    throw new CsvParseError("CSV file has no data rows.");
  }

  return { headers, rows };
}
