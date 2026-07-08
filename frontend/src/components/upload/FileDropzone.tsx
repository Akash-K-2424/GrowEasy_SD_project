"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileSpreadsheet, UploadCloud } from "lucide-react";

interface FileDropzoneProps {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFileAccepted, disabled }: FileDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFileAccepted(accepted[0]);
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    disabled,
    multiple: false,
    accept: { "text/csv": [".csv"] },
  });

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
          isDragActive
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
            : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <FileSpreadsheet className="h-10 w-10 text-indigo-500" />
        ) : (
          <UploadCloud className="h-10 w-10 text-neutral-400" />
        )}
        <div>
          <p className="text-base font-medium text-neutral-800 dark:text-neutral-100">
            Drop your CSV file here
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            or click to browse &middot; .csv files only &middot; max 10MB
          </p>
        </div>
      </div>
      {fileRejections.length > 0 && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {fileRejections[0]?.errors[0]?.message ?? "That file could not be accepted."}
        </p>
      )}
    </div>
  );
}
