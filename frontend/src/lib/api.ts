import type { ImportProgressEvent } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string } };
    return data.error?.message ?? `Request failed with status ${res.status}`;
  } catch {
    return `Request failed with status ${res.status}`;
  }
}

/**
 * Uploads the CSV to the backend and streams back newline-delimited JSON
 * progress events as each AI batch completes, ending in a "complete" or
 * "error" event. Falls back gracefully if the browser/proxy buffers the
 * whole response -- the events just arrive together instead of incrementally.
 */
export async function importCsvStream(
  file: File,
  onEvent: (event: ImportProgressEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/import/stream`, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  if (!res.body) {
    throw new Error("Streaming is not supported by this browser/environment.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    onEvent(JSON.parse(trimmed) as ImportProgressEvent);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(consumeLine);
  }
  if (buffer.trim()) consumeLine(buffer);
}
