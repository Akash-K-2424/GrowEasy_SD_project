import { describe, expect, it } from "vitest";
import type { AiRowExtraction } from "../src/schemas/crm.schema";
import { normalizeExtraction, toSingleLine } from "../src/services/normalize.service";

function row(overrides: Partial<AiRowExtraction> = {}): AiRowExtraction {
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

describe("toSingleLine (spec rule 6)", () => {
  it("escapes \\n, \\r\\n and \\r to the literal characters \\n", () => {
    expect(toSingleLine("line one\nline two")).toBe("line one\\nline two");
    expect(toSingleLine("a\r\nb\rc")).toBe("a\\nb\\nc");
  });

  it("trims surrounding whitespace", () => {
    expect(toSingleLine("  hello  ")).toBe("hello");
  });
});

describe("normalizeExtraction — created_at (spec rule 3)", () => {
  it("keeps values that new Date() already parses", () => {
    const r = normalizeExtraction(row({ created_at: "2026-05-13 14:20:48" }));
    expect(r.created_at).toBe("2026-05-13 14:20:48");
    expect(Number.isNaN(new Date(r.created_at).getTime())).toBe(false);
  });

  it("rescues unambiguous day-first dates that new Date() rejects", () => {
    const r = normalizeExtraction(row({ created_at: "25/12/2026" }));
    expect(r.created_at).toBe("2026-12-25");
    expect(Number.isNaN(new Date(r.created_at).getTime())).toBe(false);
  });

  it("rescues day-first dates with a time component", () => {
    const r = normalizeExtraction(row({ created_at: "13-05-2026 14:20:48" }));
    expect(r.created_at).toBe("2026-05-13 14:20:48");
    expect(Number.isNaN(new Date(r.created_at).getTime())).toBe(false);
  });

  it("blanks unparseable dates and preserves the original in crm_note", () => {
    const r = normalizeExtraction(row({ created_at: "next tuesday maybe" }));
    expect(r.created_at).toBe("");
    expect(r.crm_note).toContain("next tuesday maybe");
  });

  it("guarantees every non-empty output is new Date()-parseable", () => {
    const inputs = ["2026-05-13", "May 13, 2026", "31/01/2026", "13-May-2026", "??", ""];
    for (const input of inputs) {
      const r = normalizeExtraction(row({ created_at: input }));
      if (r.created_at !== "") {
        expect(Number.isNaN(new Date(r.created_at).getTime())).toBe(false);
      }
    }
  });
});

describe("normalizeExtraction — emails (spec rule 5)", () => {
  it("keeps the first email and appends the rest to crm_note", () => {
    const r = normalizeExtraction(
      row({ email: "first@x.com; second@y.com, third@z.com", crm_note: "existing" })
    );
    expect(r.email).toBe("first@x.com");
    expect(r.crm_note).toContain("existing");
    expect(r.crm_note).toContain("second@y.com");
    expect(r.crm_note).toContain("third@z.com");
  });

  it("moves an unusable non-empty email value into crm_note and blanks the field", () => {
    const r = normalizeExtraction(row({ email: "john at example dot com" }));
    expect(r.email).toBe("");
    expect(r.crm_note).toContain("john at example dot com");
  });
});

describe("normalizeExtraction — mobiles (spec rule 5)", () => {
  it("keeps the first mobile (digits only) and appends the rest to crm_note", () => {
    const r = normalizeExtraction(
      row({ mobile_without_country_code: "98765 43210 / 91234-56789" })
    );
    expect(r.mobile_without_country_code).toBe("9876543210");
    expect(r.crm_note).toContain("9123456789");
  });

  it("splits an explicit +91 prefix into country_code", () => {
    const r = normalizeExtraction(row({ mobile_without_country_code: "+91 9876543210" }));
    expect(r.mobile_without_country_code).toBe("9876543210");
    expect(r.country_code).toBe("+91");
  });

  it("does not overwrite an existing country_code", () => {
    const r = normalizeExtraction(
      row({ mobile_without_country_code: "+919876543210", country_code: "+1" })
    );
    expect(r.mobile_without_country_code).toBe("9876543210");
    expect(r.country_code).toBe("+1");
  });

  it("moves an unusable non-empty mobile value into crm_note and blanks the field", () => {
    const r = normalizeExtraction(row({ mobile_without_country_code: "N/A" }));
    expect(r.mobile_without_country_code).toBe("");
    expect(r.crm_note).toContain("N/A");
  });

  it("infers +91 for a bare 10-digit Indian mobile", () => {
    const r = normalizeExtraction(row({ mobile_without_country_code: "9876543210" }));
    expect(r.country_code).toBe("+91");
    expect(r.mobile_without_country_code).toBe("9876543210");
  });

  it("splits a 91 prefix off a 12-digit number even without a plus sign", () => {
    const r = normalizeExtraction(row({ mobile_without_country_code: "919876543210" }));
    expect(r.mobile_without_country_code).toBe("9876543210");
    expect(r.country_code).toBe("+91");
  });

  it("leaves non-Indian formats alone", () => {
    const r = normalizeExtraction(
      row({ mobile_without_country_code: "+1 202 555 1234", country_code: "" })
    );
    expect(r.mobile_without_country_code).toBe("12025551234");
    expect(r.country_code).toBe("");
  });
});

describe("normalizeExtraction — single-line guarantee across fields", () => {
  it("escapes newlines in every field so each record stays one CSV row", () => {
    const r = normalizeExtraction(
      row({
        crm_note: "Called twice.\nWill call again.",
        description: "Line 1\r\nLine 2",
        name: "John\nDoe",
      })
    );
    for (const value of Object.values(r)) {
      expect(String(value)).not.toMatch(/\r|\n/);
    }
    expect(r.crm_note).toContain("Called twice.\\nWill call again.");
  });
});
