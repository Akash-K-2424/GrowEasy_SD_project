import { afterEach, describe, expect, it, vi } from "vitest";
import { FetchTimeoutError, fetchWithTimeout } from "../src/utils/fetchWithTimeout";

describe("fetchWithTimeout", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("resolves normally when the upstream responds before the timeout", async () => {
    const response = new Response("ok", { status: 200 });
    global.fetch = vi.fn().mockResolvedValue(response);

    const result = await fetchWithTimeout("https://example.com", {}, 1000);
    expect(result).toBe(response);
  });

  it("aborts and throws FetchTimeoutError when the upstream hangs past the timeout", async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted.");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    await expect(fetchWithTimeout("https://example.com", {}, 20)).rejects.toThrow(
      FetchTimeoutError
    );
  });

  it("rethrows non-abort errors unchanged", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(fetchWithTimeout("https://example.com", {}, 1000)).rejects.toThrow(
      "network down"
    );
  });
});
