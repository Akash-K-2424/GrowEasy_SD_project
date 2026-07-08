import { describe, expect, it } from "vitest";
import { batchExtractionJsonSchema, toGeminiResponseSchema } from "../src/services/ai/jsonSchema";

function hasKeyDeep(value: unknown, key: string): boolean {
  if (Array.isArray(value)) return value.some((v) => hasKeyDeep(v, key));
  if (value !== null && typeof value === "object") {
    return Object.entries(value).some(([k, v]) => k === key || hasKeyDeep(v, key));
  }
  return false;
}

describe("toGeminiResponseSchema", () => {
  it("strips additionalProperties recursively (Gemini rejects the whole request otherwise)", () => {
    const geminiSchema = toGeminiResponseSchema(batchExtractionJsonSchema);
    expect(hasKeyDeep(batchExtractionJsonSchema, "additionalProperties")).toBe(true);
    expect(hasKeyDeep(geminiSchema, "additionalProperties")).toBe(false);
  });

  it("drops enum constraints that include an empty-string member (Gemini rejects those outright)", () => {
    const geminiSchema = toGeminiResponseSchema(batchExtractionJsonSchema) as {
      properties: { rows: { items: { properties: { crm_status: object; data_source: object } } } };
    };
    const { crm_status, data_source } = geminiSchema.properties.rows.items.properties;
    expect(crm_status).not.toHaveProperty("enum");
    expect(data_source).not.toHaveProperty("enum");
  });

  it("preserves the fields Gemini's schema subset does support", () => {
    const geminiSchema = toGeminiResponseSchema(batchExtractionJsonSchema) as {
      type: string;
      required: string[];
      properties: { rows: { type: string; items: { properties: Record<string, unknown> } } };
    };
    expect(geminiSchema.type).toBe("object");
    expect(geminiSchema.required).toEqual(["rows"]);
    expect(geminiSchema.properties.rows.type).toBe("array");
    expect(geminiSchema.properties.rows.items.properties).toHaveProperty("email");
  });
});
