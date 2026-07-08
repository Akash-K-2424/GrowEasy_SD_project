import { Loader2, Sparkles } from "lucide-react";
import type { ImportProgress } from "@/hooks/useCsvImport";

interface ProcessingStepProps {
  progress: ImportProgress | null;
}

export function ProcessingStep({ progress }: ProcessingStepProps) {
  const pct = progress ? Math.round((progress.rowsProcessed / progress.totalRows) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-neutral-200 bg-white px-8 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/50">
        <Sparkles className="h-7 w-7 text-indigo-500" />
        <Loader2 className="absolute h-16 w-16 animate-spin text-indigo-200 dark:text-indigo-900" />
      </div>

      <div>
        <p className="text-lg font-medium text-neutral-800 dark:text-neutral-100">
          AI is mapping your leads into GrowEasy CRM format&hellip;
        </p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {progress
            ? `Batch ${progress.batchIndex} of ${progress.totalBatches} · ${progress.rowsProcessed.toLocaleString()} of ${progress.totalRows.toLocaleString()} rows processed`
            : "Uploading your file and starting extraction…"}
        </p>
      </div>

      <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress ? Math.max(pct, 4) : 8}%` }}
        />
      </div>
    </div>
  );
}
