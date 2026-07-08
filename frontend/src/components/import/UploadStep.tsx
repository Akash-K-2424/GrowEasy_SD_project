"use client";

import { FileDown } from "lucide-react";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { downloadSampleCsv } from "@/components/upload/sampleCsv";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

interface UploadStepProps {
  onFileAccepted: (file: File) => void;
  error: string | null;
}

export function UploadStep({ onFileAccepted, error }: UploadStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <FileDropzone onFileAccepted={onFileAccepted} />
      {error && <ErrorBanner message={error} />}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        <p className="font-medium text-neutral-800 dark:text-neutral-200">Works with any CSV layout</p>
        <p className="mt-1">
          Facebook Lead Ads, Google Ads exports, Excel sheets, real-estate CRM exports, sales
          reports, marketing agency sheets, or manually created spreadsheets -- column names and
          layout don&apos;t need to match anything. AI maps them to the GrowEasy CRM schema after
          you confirm the import.
        </p>
        <button
          type="button"
          onClick={downloadSampleCsv}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <FileDown className="h-4 w-4" />
          Download a sample CSV to try it out
        </button>
      </div>
    </div>
  );
}
