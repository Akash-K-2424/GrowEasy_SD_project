import { Check } from "lucide-react";
import type { ImportStep } from "@/hooks/useCsvImport";

const STEPS: { key: ImportStep; label: string }[] = [
  { key: "upload", label: "Upload CSV" },
  { key: "preview", label: "Preview" },
  { key: "processing", label: "AI Mapping" },
  { key: "result", label: "Results" },
];

export function StepIndicator({ current }: { current: ImportStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                isDone
                  ? "bg-indigo-600 text-white"
                  : isActive
                    ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 dark:bg-indigo-950 dark:text-indigo-300"
                    : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
              }`}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <span
              className={`hidden text-sm sm:inline ${
                isActive
                  ? "font-medium text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <div className="mx-1 h-px w-4 bg-neutral-200 sm:w-8 dark:bg-neutral-800" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
