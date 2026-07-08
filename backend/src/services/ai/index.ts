import { env } from "../../config/env";
import { AnthropicProvider } from "./anthropic.provider";
import { GeminiProvider } from "./gemini.provider";
import { MockProvider } from "./mock.provider";
import { OpenAiProvider } from "./openai.provider";
import { ProviderConfigError, type LLMProvider } from "./types";

export type { LLMProvider, ExtractBatchInput } from "./types";
export { LLMProviderError, ProviderConfigError } from "./types";

let cached: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cached) return cached;

  switch (env.LLM_PROVIDER) {
    case "anthropic": {
      if (!env.ANTHROPIC_API_KEY) {
        throw new ProviderConfigError(
          "Server misconfigured: ANTHROPIC_API_KEY is not set (LLM_PROVIDER=anthropic). Add it to backend/.env and restart the server."
        );
      }
      cached = new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
      break;
    }
    case "openai": {
      if (!env.OPENAI_API_KEY) {
        throw new ProviderConfigError(
          "Server misconfigured: OPENAI_API_KEY is not set (LLM_PROVIDER=openai). Add it to backend/.env and restart the server."
        );
      }
      cached = new OpenAiProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
      break;
    }
    case "gemini": {
      if (!env.GEMINI_API_KEY) {
        throw new ProviderConfigError(
          "Server misconfigured: GEMINI_API_KEY is not set (LLM_PROVIDER=gemini). Add it to backend/.env and restart the server."
        );
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
