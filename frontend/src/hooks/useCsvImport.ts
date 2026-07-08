"use client";

import { useCallback, useRef, useState } from "react";
import { importCsvStream } from "@/lib/api";
import { CsvParseError, parseCsvFile } from "@/lib/csv";
import type { ImportSummary, ParsedCsvPreview } from "@/lib/types";

export type ImportStep = "upload" | "preview" | "processing" | "result";

export interface ImportProgress {
  batchIndex: number;
  totalBatches: number;
  rowsProcessed: number;
  totalRows: number;
}

export function useCsvImport() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedCsvPreview | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleFileAccepted = useCallback(async (selected: File) => {
    setError(null);
    try {
      const parsed = await parseCsvFile(selected);
      setFile(selected);
      setPreview(parsed);
      setStep("preview");
    } catch (err) {
      setError(
        err instanceof CsvParseError || err instanceof Error
          ? err.message
          : "Failed to read this CSV file."
      );
    }
  }, []);

  const confirmImport = useCallback(async () => {
    if (!file) return;
    setStep("processing");
    setProgress(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await importCsvStream(
        file,
        (event) => {
          if (event.type === "progress") {
            setProgress({
              batchIndex: event.batchIndex,
              totalBatches: event.totalBatches,
              rowsProcessed: event.rowsProcessed,
              totalRows: event.totalRows,
            });
          } else if (event.type === "complete") {
            setResult(event.data);
            setStep("result");
          } else if (event.type === "error") {
            setError(event.message);
            setStep("preview");
          }
        },
        controller.signal
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Import failed. Please try again.");
      setStep("preview");
    }
  }, [file]);

  const cancelPreview = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
    setStep("upload");
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStep("upload");
    setFile(null);
    setPreview(null);
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    step,
    file,
    preview,
    progress,
    result,
    error,
    handleFileAccepted,
    confirmImport,
    cancelPreview,
    reset,
  };
}
