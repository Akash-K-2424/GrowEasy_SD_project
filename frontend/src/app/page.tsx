"use client";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { StepIndicator } from "@/components/import/StepIndicator";
import { UploadStep } from "@/components/import/UploadStep";
import { PreviewStep } from "@/components/import/PreviewStep";
import { ProcessingStep } from "@/components/import/ProcessingStep";
import { ResultStep } from "@/components/import/ResultStep";
import { useCsvImport } from "@/hooks/useCsvImport";

export default function Home() {
  const {
    step,
    preview,
    progress,
    result,
    error,
    handleFileAccepted,
    confirmImport,
    cancelPreview,
    reset,
  } = useCsvImport();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold tracking-wide text-indigo-600 dark:text-indigo-400">
              GrowEasy
            </p>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              AI-Powered CSV Lead Importer
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <StepIndicator current={step} />

        {step === "upload" && <UploadStep onFileAccepted={handleFileAccepted} error={error} />}

        {step === "preview" && preview && (
          <PreviewStep
            preview={preview}
            onConfirm={confirmImport}
            onCancel={cancelPreview}
            error={error}
          />
        )}

        {step === "processing" && <ProcessingStep progress={progress} />}

        {step === "result" && result && <ResultStep result={result} onReset={reset} />}
      </main>

      <footer className="border-t border-neutral-200 py-4 text-center text-xs text-neutral-400 dark:border-neutral-800 dark:text-neutral-600">
        Built for the GrowEasy Software Developer assignment.
      </footer>
    </div>
  );
}
