/** Mirrors backend/src/schemas/crm.schema.ts -- kept in sync manually since
 * the frontend and backend are independently deployable services. */

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

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number] | "";
export type DataSource = (typeof DATA_SOURCE_VALUES)[number] | "";

export interface CrmRecord {
  sourceRow: number;
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus;
  crm_note: string;
  data_source: DataSource;
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  sourceRow: number;
  reason: string;
  raw: Record<string, string>;
}

export interface ImportSummary {
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
}

export interface ParsedCsvPreview {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  fileSizeBytes: number;
}

export type ImportProgressEvent =
  | {
      type: "progress";
      batchIndex: number;
      totalBatches: number;
      rowsProcessed: number;
      totalRows: number;
      batchFailed?: boolean;
    }
  | { type: "complete"; data: ImportSummary }
  | { type: "error"; message: string };

export const CRM_FIELD_LABELS: Record<keyof Omit<CrmRecord, "sourceRow">, string> = {
  created_at: "Created At",
  name: "Name",
  email: "Email",
  country_code: "Country Code",
  mobile_without_country_code: "Mobile",
  company: "Company",
  city: "City",
  state: "State",
  country: "Country",
  lead_owner: "Lead Owner",
  crm_status: "Status",
  crm_note: "Note",
  data_source: "Source",
  possession_time: "Possession Time",
  description: "Description",
};
