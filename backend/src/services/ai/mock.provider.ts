import type { AiRowExtraction } from "../../schemas/crm.schema";
import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES } from "../../schemas/crm.schema";
import type { ExtractBatchInput, LLMProvider } from "./types";

const EMAIL_RE = /[^\s,;"']+@[^\s,;"']+\.[^\s,;"']+/;

function findColumn(headers: string[], keywords: string[]): string | undefined {
  return headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k)));
}

function findColumns(headers: string[], keywords: string[]): string[] {
  return headers.filter((h) => keywords.some((k) => h.toLowerCase().includes(k)));
}

/** Joins the values of every matching column (e.g. "Contact" + "Alt Contact")
 * with a separator the downstream normalizer splits on, so the first value
 * wins and the rest land in crm_note per spec rule 5. */
function joinColumns(row: Record<string, string>, cols: string[], separator: string): string {
  return cols
    .map((col) => row[col] ?? "")
    .filter((v) => v.length > 0)
    .join(separator);
}

function matchEnum<T extends readonly string[]>(value: string, values: T): T[number] | "" {
  const found = values.find((v) => v.toLowerCase() === value.toLowerCase());
  return (found as T[number]) ?? "";
}

/**
 * Deterministic, keyword-based field mapper used only when LLM_PROVIDER=mock.
 * It exists so the full upload -> preview -> import -> results flow can be
 * exercised locally/in demos without an LLM API key. It is intentionally
 * simple and is NOT a substitute for the real providers' ambiguous-column
 * reasoning -- see anthropic.provider.ts / openai.provider.ts / gemini.provider.ts.
 */
export class MockProvider implements LLMProvider {
  readonly name = "mock";

  async extractBatch({ headers, rows }: ExtractBatchInput): Promise<AiRowExtraction[]> {
    const nameCol = findColumn(headers, ["name", "full name", "lead", "client", "contact person"]);
    const emailCols = findColumns(headers, ["email", "mail"]);
    // "contact" alone would also match name-ish columns like "Contact Person".
    const phoneCols = findColumns(headers, ["phone", "mobile", "contact", "whatsapp", "ph no", "tel"]).filter(
      (h) => !/person|name|owner|email|mail/i.test(h)
    );
    const companyCol = findColumn(headers, ["company", "organisation", "organization", "builder"]);
    const cityCol = findColumn(headers, ["city"]);
    const stateCol = findColumn(headers, ["state"]);
    const countryCol = findColumn(headers, ["country"]);
    const ownerCol = findColumn(headers, ["owner", "agent", "assigned", "sales rep"]);
    const statusCol = findColumn(headers, ["status", "stage", "disposition"]);
    const sourceCol = findColumn(headers, ["source", "campaign"]);
    const dateCol = findColumn(headers, ["date", "created", "dt"]);
    const noteCol = findColumn(headers, ["note", "remark", "comment"]);
    const possessionCol = findColumn(headers, ["possession"]);
    const descCol = findColumn(headers, ["description", "detail"]);

    return rows.map((row) => {
      // Whole-row email scan ONLY when no email-ish column exists at all --
      // if one exists but is empty for this row, that's the answer; scanning
      // other columns would steal e.g. the lead OWNER's email address.
      const email =
        emailCols.length > 0
          ? joinColumns(row, emailCols, "; ")
          : Object.values(row).join(" ").match(EMAIL_RE)?.[0] ?? "";
      // Raw pass-through: splitting multi-phone cells, digit normalization and
      // country-code inference are the normalize.service's job, applied to
      // every provider's output downstream. (No whole-row phone scan: too easy
      // to mistake a date or an ID column for a phone number.)
      const phoneRaw = joinColumns(row, phoneCols, " / ");

      const extraction: AiRowExtraction = {
        created_at: (dateCol && row[dateCol]) || "",
        name: (nameCol && row[nameCol]) || "",
        email,
        country_code: "",
        mobile_without_country_code: phoneRaw,
        company: (companyCol && row[companyCol]) || "",
        city: (cityCol && row[cityCol]) || "",
        state: (stateCol && row[stateCol]) || "",
        country: (countryCol && row[countryCol]) || "",
        lead_owner: (ownerCol && row[ownerCol]) || "",
        crm_status: statusCol ? matchEnum(row[statusCol] ?? "", CRM_STATUS_VALUES) : "",
        crm_note: (noteCol && row[noteCol]) || "",
        data_source: sourceCol ? matchEnum(row[sourceCol] ?? "", DATA_SOURCE_VALUES) : "",
        possession_time: (possessionCol && row[possessionCol]) || "",
        description: (descCol && row[descCol]) || "",
      };
      return extraction;
    });
  }
}
