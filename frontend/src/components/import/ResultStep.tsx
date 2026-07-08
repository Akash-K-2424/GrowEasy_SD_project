"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Papa from "papaparse";
import { Download, RotateCcw, Search, X } from "lucide-react";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { CRM_FIELD_LABELS, type CrmRecord, type ImportSummary, type SkippedRecord } from "@/lib/types";

interface ResultStepProps {
  result: ImportSummary;
  onReset: () => void;
}

const CRM_FIELD_ORDER = Object.keys(CRM_FIELD_LABELS) as (keyof Omit<CrmRecord, "sourceRow">)[];

function statusTone(status: CrmRecord["crm_status"]) {
  switch (status) {
    case "SALE_DONE":
      return "success" as const;
    case "GOOD_LEAD_FOLLOW_UP":
      return "warning" as const;
    case "BAD_LEAD":
      return "danger" as const;
    case "DID_NOT_CONNECT":
      return "neutral" as const;
    default:
      return "neutral" as const;
  }
}

function downloadCrmCsv(records: CrmRecord[]) {
  const rows = records.map((record) =>
    Object.fromEntries(CRM_FIELD_ORDER.map((field) => [field, record[field]]))
  );
  const csv = Papa.unparse(rows, { columns: CRM_FIELD_ORDER as string[] });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "groweasy-crm-import.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ResultStep({ result, onReset }: ResultStepProps) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();

  const filteredRecords = useMemo(() => {
    if (!query) return result.records;
    return result.records.filter(
      (r) => r.email.toLowerCase().includes(query) || r.mobile_without_country_code.includes(query)
    );
  }, [result.records, query]);

  const filteredSkipped = useMemo(() => {
    if (!query) return result.skipped;
    return result.skipped.filter(
      (r) =>
        r.reason.toLowerCase().includes(query) ||
        Object.values(r.raw).some((v) => v.toLowerCase().includes(query))
    );
  }, [result.skipped, query]);

  const successColumns = useMemo<ColumnDef<CrmRecord, unknown>[]>(
    () =>
      CRM_FIELD_ORDER.map((field) => ({
        id: field,
        header: CRM_FIELD_LABELS[field],
        accessorFn: (row) => row[field],
        cell: (info) => {
          const value = info.getValue() as string;
          if (!value) return <span className="text-neutral-400 dark:text-neutral-600">—</span>;
          if (field === "crm_status") {
            return <Badge tone={statusTone(value as CrmRecord["crm_status"])}>{value}</Badge>;
          }
          if (field === "data_source") return <Badge>{value}</Badge>;
          return value;
        },
      })),
    []
  );

  const skippedColumns = useMemo<ColumnDef<SkippedRecord, unknown>[]>(
    () => [
      { id: "sourceRow", header: "Row #", accessorFn: (r) => r.sourceRow },
      { id: "reason", header: "Reason", accessorFn: (r) => r.reason },
      {
        id: "raw",
        header: "Original Row Data",
        accessorFn: (r) =>
          Object.entries(r.raw)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join("  ·  "),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Rows" value={result.totalRows} />
        <StatCard label="Imported" value={result.totalImported} tone="success" />
        <StatCard label="Skipped" value={result.totalSkipped} tone="danger" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
          <button
            onClick={() => setTab("imported")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "imported"
                ? "bg-indigo-600 text-white"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            Imported ({result.totalImported})
          </button>
          <button
            onClick={() => setTab("skipped")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "skipped"
                ? "bg-indigo-600 text-white"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            Skipped ({result.totalSkipped})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or phone number..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-8 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => downloadCrmCsv(result.records)} disabled={result.records.length === 0}>
            <Download className="h-4 w-4" />
            Download CRM CSV
          </Button>
          <Button variant="secondary" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Import Another File
          </Button>
        </div>
      </div>

      {tab === "imported" ? (
        <DataTable
          columns={successColumns}
          data={filteredRecords}
          emptyMessage={
            query ? "No imported leads match your search." : "No records were successfully imported."
          }
          className="max-h-[32rem]"
        />
      ) : (
        <DataTable
          columns={skippedColumns}
          data={filteredSkipped}
          emptyMessage={
            query
              ? "No skipped rows match your search."
              : "Nothing was skipped -- every row had an email or mobile number."
          }
          className="max-h-[32rem]"
        />
      )}
    </div>
  );
}
