import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES } from "../../schemas/crm.schema";

/**
 * A single JSON Schema, shared across providers, describing one extracted CRM row.
 * Anthropic consumes it as a tool `input_schema`, OpenAI as a `json_schema` response
 * format, and Gemini as a `responseSchema` -- all three accept plain JSON Schema.
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
