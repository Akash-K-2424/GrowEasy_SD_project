import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES } from "../../schemas/crm.schema";

/**
 * A single JSON Schema, shared across providers, describing one extracted CRM row.
 * Anthropic consumes it as a tool `input_schema` and OpenAI as a `json_schema`
 * response format, both accepting plain JSON Schema. Gemini's `responseSchema`
 * only supports a restricted OpenAPI 3.0 subset -- notably no
 * `additionalProperties` -- so it consumes a stripped copy; see
 * `toGeminiResponseSchema` below.
 */
export const rowExtractionJsonSchema = {
  type: "object",
  properties: {
    created_at: { type: "string" },
    name: { type: "string" },
    email: { type: "string" },
    country_code: { type: "string" },
    mobile_without_country_code: { type: "string" },
    company: { type: "string" },
    city: { type: "string" },
    state: { type: "string" },
    country: { type: "string" },
    lead_owner: { type: "string" },
    crm_status: { type: "string", enum: [...CRM_STATUS_VALUES, ""] },
    crm_note: { type: "string" },
    data_source: { type: "string", enum: [...DATA_SOURCE_VALUES, ""] },
    possession_time: { type: "string" },
    description: { type: "string" },
  },
  required: [
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
  ],
  additionalProperties: false,
} as const;

export const batchExtractionJsonSchema = {
  type: "object",
  properties: {
    rows: { type: "array", items: rowExtractionJsonSchema },
  },
  required: ["rows"],
  additionalProperties: false,
} as const;

/**
 * Gemini's `responseSchema` rejects the whole request if it sees a field it
 * doesn't recognize (e.g. `additionalProperties`) -- unlike Anthropic/OpenAI,
 * which just ignore extra JSON Schema keywords. It also rejects an empty
 * string as an `enum` member outright, which we rely on elsewhere to mean
 * "leave this blank" -- so for Gemini we drop the enum constraint and lean on
 * `schemas/crm.schema.ts`'s own case-insensitive validation (which already
 * coerces any out-of-list value to "" regardless of provider) to enforce it
 * instead. Strip both, recursively.
 */
export function toGeminiResponseSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(toGeminiResponseSchema);
  }
  if (schema !== null && typeof schema === "object") {
    const entries = Object.entries(schema).filter(([key, value]) => {
      if (key === "additionalProperties") return false;
      if (key === "enum" && Array.isArray(value) && value.includes("")) return false;
      return true;
    });
    return Object.fromEntries(entries.map(([key, value]) => [key, toGeminiResponseSchema(value)]));
  }
  return schema;
}
