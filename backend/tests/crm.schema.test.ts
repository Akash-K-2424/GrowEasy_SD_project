import { describe, expect, it } from "vitest";
import { AiRowExtractionSchema } from "../src/schemas/crm.schema";

describe("AiRowExtractionSchema hardening", () => {
  it("coerces JSON numbers and nulls to strings instead of failing the batch", () => {
    const parsed = AiRowExtractionSchema.parse({
      created_at: null,
      name: "John",
      email: "john@x.com",
      country_code: 91,
      mobile_without_country_code: 9876543210,
      company: null,
      city: "",
      state: "",
      country: "",
      lead_owner: "",
      crm_status: "",
      crm_note: "",
      data_source: "",
      possession_time: "",
      description: "",
    });
    expect(parsed.mobile_without_country_code).toBe("9876543210");
    expect(parsed.country_code).toBe("91");
    expect(parsed.created_at).toBe("");
    expect(parsed.company).toBe("");
  });

  it("matches crm_status case-insensitively", () => {
    const parsed = AiRowExtractionSchema.parse({ crm_status: "sale_done" });
    expect(parsed.crm_status).toBe("SALE_DONE");
  });

  it("matches data_source case-insensitively", () => {
    const parsed = AiRowExtractionSchema.parse({ data_source: "Eden_Park" });
    expect(parsed.data_source).toBe("eden_park");
  });

  it("still coerces values outside the allowed enums to empty strings", () => {
    const parsed = AiRowExtractionSchema.parse({
      crm_status: "VERY_INTERESTED",
      data_source: "facebook",
    });
    expect(parsed.crm_status).toBe("");
    expect(parsed.data_source).toBe("");
  });
});
