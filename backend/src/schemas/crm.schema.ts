import { z } from "zod";

export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

/** LLMs occasionally return a JSON number (phone, zip) or null where the schema
 * asks for a string. Rejecting the whole batch over that would burn all retries
 * on a trivial type issue, so coerce instead of failing. */
const looseString = z.preprocess(
  (value) => (value == null ? "" : typeof value === "string" ? value : String(value)),
  z.string()
);

/** Enum fields are matched case-insensitively ("sale_done" is unambiguously
 * SALE_DONE); anything outside the allowed list is still coerced to "". */
const crmStatus = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.union([z.enum(CRM_STATUS_VALUES), z.literal("")])
).catch("");

const dataSource = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.union([z.enum(DATA_SOURCE_VALUES), z.literal("")])
).catch("");

/** What we ask the AI to return for a single row. Every field is a best-effort
 * string; the AI leaves a field "" when it cannot confidently extract it. */
export const AiRowExtractionSchema = z.object({
  created_at: looseString.default(""),
  name: looseString.default(""),
  email: looseString.default(""),
  country_code: looseString.default(""),
  mobile_without_country_code: looseString.default(""),
  company: looseString.default(""),
  city: looseString.default(""),
  state: looseString.default(""),
  country: looseString.default(""),
  lead_owner: looseString.default(""),
  crm_status: crmStatus,
  crm_note: looseString.default(""),
  data_source: dataSource,
  possession_time: looseString.default(""),
  description: looseString.default(""),
});

export type AiRowExtraction = z.infer<typeof AiRowExtractionSchema>;

/** A CRM record enriched with bookkeeping fields returned to the frontend. */
export interface CrmRecord extends AiRowExtraction {
  sourceRow: number;
}

export interface SkippedRecord {
  sourceRow: number;
  reason: string;
  raw: Record<string, string>;
}

export const AiBatchResponseSchema = z.object({
  rows: z.array(AiRowExtractionSchema),
});
