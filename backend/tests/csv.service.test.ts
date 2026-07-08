import { describe, expect, it } from "vitest";
import { CsvParseError, parseCsv } from "../src/services/csv.service";

describe("parseCsv", () => {
  it("parses a well-formed CSV with headers", () => {
    const csv = "name,email\nJohn Doe,john@example.com\nJane Doe,jane@example.com";
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(["name", "email"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: "John Doe", email: "john@example.com" });
  });

  it("handles arbitrary, non-standard column names", () => {
    const csv = "Full Name,Contact No.,Ph Email ID\nJohn,999,john@x.com";
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(["Full Name", "Contact No.", "Ph Email ID"]);
    expect(rows[0]["Contact No."]).toBe("999");
  });

  it("handles quoted fields containing commas and newlines", () => {
    const csv =
      'name,note\n"Doe, John","Called, said ""busy""\nwill retry"\nJane,"simple note"';
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Doe, John");
    expect(rows[0].note).toContain("busy");
  });

  it("drops fully blank rows", () => {
    const csv = "name,email\nJohn,john@x.com\n,\nJane,jane@x.com";
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it("trims whitespace in headers and values", () => {
    const csv = " name , email \n John , john@x.com ";
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(["name", "email"]);
    expect(rows[0].name).toBe("John");
  });

  it("throws CsvParseError when there is no header row", () => {
    expect(() => parseCsv("")).toThrow(CsvParseError);
  });

  it("throws CsvParseError when there are no data rows", () => {
    expect(() => parseCsv("name,email\n")).toThrow(CsvParseError);
  });
});
