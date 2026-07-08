import { beforeEach, describe, expect, it, vi } from "vitest";

describe("getLLMProvider — missing API key", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws ProviderConfigError (not a generic Error) when the anthropic key is missing", async () => {
    vi.doMock("../src/config/env", () => ({
      env: { LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: undefined, ANTHROPIC_MODEL: "claude-sonnet-5" },
    }));

    const { getLLMProvider, ProviderConfigError } = await import("../src/services/ai");

    expect(() => getLLMProvider()).toThrow(ProviderConfigError);
    expect(() => getLLMProvider()).toThrow(/ANTHROPIC_API_KEY is not set/);
  });

  it("throws ProviderConfigError when the gemini key is missing", async () => {
    vi.doMock("../src/config/env", () => ({
      env: { LLM_PROVIDER: "gemini", GEMINI_API_KEY: undefined, GEMINI_MODEL: "gemini-2.0-flash" },
    }));

    const { getLLMProvider, ProviderConfigError } = await import("../src/services/ai");

    expect(() => getLLMProvider()).toThrow(ProviderConfigError);
    expect(() => getLLMProvider()).toThrow(/GEMINI_API_KEY is not set/);
  });
});
