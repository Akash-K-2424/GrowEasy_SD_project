"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText } from "lucide-react";
import { DataTable } from "@/components/table/DataTable";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import type { ParsedCsvPreview } from "@/lib/types";

interface PreviewStepProps {
  preview: ParsedCsvPreview;
  onConfirm: () => void;
  onCancel: () => void;
  /** Set when a confirmed import failed and the user was returned here. */
  error?: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function PreviewStep({ preview, onConfirm, onCancel, error }: PreviewStepProps) {
  const columns = useMemo<ColumnDef<Record<string, string>, unknown>[]>(
    () =>
      preview.headers.map((header) => ({
        id: header,
        header,
        accessorFn: (row) => row[header] ?? "",
        cell: (info) => {
          const value = info.getValue() as string;
          return value ? value : <span className="text-neutral-400 dark:text-neutral-600">—</span>;
        },
      })),
    [preview.headers]
  );

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorBanner message={`Import failed: ${error} — your file is still here, try again.`} />}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-neutral-400" />
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              {preview.fileName}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {formatBytes(preview.fileSizeBytes)} &middot; {preview.rows.length.toLocaleString()}{" "}
              rows &middot; {preview.headers.length} columns
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Choose a different file
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Confirm &amp; Import
          </Button>
        </div>
      </div>

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Preview of the raw file -- nothing has been sent to the AI yet. Review it, then confirm to
        run the CRM field mapping.
      </p>

      <DataTable columns={columns} data={preview.rows} className="max-h-[32rem]" />
    </div>
  );
}
