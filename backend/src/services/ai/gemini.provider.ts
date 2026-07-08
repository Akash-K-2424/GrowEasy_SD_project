import { AiBatchResponseSchema, type AiRowExtraction } from "../../schemas/crm.schema";
import { batchExtractionJsonSchema } from "./jsonSchema";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import type { ExtractBatchInput, LLMProvider } from "./types";
import { LLMProviderError } from "./types";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";

  constructor(
    private apiKey: string,
    private model = "gemini-2.0-flash"
  ) {}

  async extractBatch(input: ExtractBatchInput): Promise<AiRowExtraction[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: buildUserPrompt(input) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: batchExtractionJsonSchema,
          },
        }),
      });
    } catch (err) {
      throw new LLMProviderError(`Gemini request failed: ${(err as Error).message}`, err);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new LLMProviderError(`Gemini returned ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new LLMProviderError("Gemini response had no candidate text.");
    }

    try {
      const parsed = AiBatchResponseSchema.parse(JSON.parse(text));
      return parsed.rows;
    } catch (err) {
      throw new LLMProviderError(
        `Gemini response failed schema validation: ${(err as Error).message}`,
        err
      );
    }
  }
}
