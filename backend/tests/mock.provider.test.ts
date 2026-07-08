import { describe, expect, it } from "vitest";
import { MockProvider } from "../src/services/ai/mock.provider";

describe("MockProvider", () => {
  it("maps arbitrarily-named columns to CRM fields by keyword", async () => {
    const provider = new MockProvider();
    const result = await provider.extractBatch({
      headers: ["Full Name", "Email Address", "Ph No", "Status", "Source"],
      rows: [
        {
          "Full Name": "John Doe",
          "Email Address": "john@example.com",
          "Ph No": "9876543210",
          Status: "GOOD_LEAD_FOLLOW_UP",
          Source: "eden_park",
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("John Doe");
    expect(result[0].email).toBe("john@example.com");
    // The mock passes the phone cell through raw; digit/country-code
    // normalization happens downstream in normalize.service for all providers.
    expect(result[0].mobile_without_country_code).toBe("9876543210");
    expect(result[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(result[0].data_source).toBe("eden_park");
  });

  it("leaves crm_status/data_source blank when the value isn't in the allowed list", async () => {
    const provider = new MockProvider();
    const result = await provider.extractBatch({
      headers: ["Name", "Email", "Status", "Source"],
      rows: [{ Name: "Jane", Email: "jane@x.com", Status: "somewhat interested", Source: "facebook" }],
    });

    expect(result[0].crm_status).toBe("");
    expect(result[0].data_source).toBe("");
  });

  it("does not steal another column's email when the email column is empty for a row", async () => {
    const provider = new MockProvider();
    const result = await provider.extractBatch({
      headers: ["Lead Name", "Email ID", "Assigned To"],
      rows: [{ "Lead Name": "Anonymous Walk-in", "Email ID": "", "Assigned To": "owner@groweasy.ai" }],
    });

    expect(result[0].email).toBe("");
    expect(result[0].lead_owner).toBe("owner@groweasy.ai");
  });

  it("joins multiple phone columns so the normalizer can keep the first and note the rest", async () => {
    const provider = new MockProvider();
    const result = await provider.extractBatch({
      headers: ["Lead Name", "Contact", "Alt Contact"],
      rows: [{ "Lead Name": "Rajesh", Contact: "9876543212", "Alt Contact": "9876500011" }],
    });

    expect(result[0].mobile_without_country_code).toBe("9876543212 / 9876500011");
  });

  it("does not treat a name-ish 'Contact Person' column as a phone column", async () => {
    const provider = new MockProvider();
    const result = await provider.extractBatch({
      headers: ["Contact Person", "Phone"],
      rows: [{ "Contact Person": "John Smith", Phone: "9876543210" }],
    });

    expect(result[0].mobile_without_country_code).toBe("9876543210");
  });

  it("falls back to scanning the whole row for an email when no column matches", async () => {
    const provider = new MockProvider();
    const result = await provider.extractBatch({
      headers: ["Notes"],
      rows: [{ Notes: "Reach out to jane@example.com or +91 9876543210" }],
    });

    expect(result[0].email).toBe("jane@example.com");
    // Phones are deliberately NOT scanned from arbitrary columns (dates and IDs
    // look like phone numbers); only a recognized phone column is used.
    expect(result[0].mobile_without_country_code).toBe("");
  });
});
