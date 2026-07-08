import Papa from "papaparse";
import type { ParsedCsvPreview } from "./types";

export class CsvParseError extends Error {}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Client-side parse used only to render the Step 2 preview -- no AI involved. */
export function parseCsvFile(file: File): Promise<ParsedCsvPreview> {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return Promise.reject(new CsvParseError("Only .csv files are supported."));
  }
  if (file.size === 0) {
    return Promise.reject(new CsvParseError("This file is empty."));
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Promise.reject(new CsvParseError("File is larger than the 10MB limit."));
  }

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      transform: (value) => (typeof value === "string" ? value.trim() : value),
      complete: (result) => {
        const fatal = result.errors.find((e) => e.type !== "FieldMismatch");
        if (fatal) {
          reject(new CsvParseError(`Could not parse CSV: ${fatal.message}`));
          return;
        }

        const headers = (result.meta.fields ?? []).filter((h) => h.length > 0);
        if (headers.length === 0) {
          reject(new CsvParseError("CSV file has no recognizable header row."));
          return;
        }

        const rows = result.data.filter((row) =>
          Object.values(row).some((v) => typeof v === "string" && v.length > 0)
        );
        if (rows.length === 0) {
          reject(new CsvParseError("CSV file has no data rows."));
          return;
        }

        resolve({ headers, rows, fileName: file.name, fileSizeBytes: file.size });
      },
      error: (err) => reject(new CsvParseError(err.message)),
    });
  });
}
