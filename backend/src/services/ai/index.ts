import { env } from "../../config/env";
import { AnthropicProvider } from "./anthropic.provider";
import { GeminiProvider } from "./gemini.provider";
import { MockProvider } from "./mock.provider";
import { OpenAiProvider } from "./openai.provider";
import type { LLMProvider } from "./types";

export type { LLMProvider, ExtractBatchInput } from "./types";
export { LLMProviderError } from "./types";

let cached: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cached) return cached;

  switch (env.LLM_PROVIDER) {
    case "anthropic": {
      if (!env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic");
      }
      cached = new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
      break;
    }
    case "openai": {
      if (!env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
      }
      cached = new OpenAiProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
      break;
    }
    case "gemini": {
      if (!env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");
      }
      cached = new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL);
      break;
    }
    case "mock": {
      cached = new MockProvider();
      break;
    }
  }
  return cached;
}

/** Test-only escape hatch to inject a fake provider and reset memoization. */
export function __setProviderForTests(provider: LLMProvider | null): void {
  cached = provider;
}
