import { AiBatchResponseSchema, type AiRowExtraction } from "../../schemas/crm.schema";
import { batchExtractionJsonSchema } from "./jsonSchema";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import type { ExtractBatchInput, LLMProvider } from "./types";
import { LLMProviderError } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAiProvider implements LLMProvider {
  readonly name = "openai";

  constructor(
    private apiKey: string,
    private model = "gpt-4o-mini"
  ) {}

  async extractBatch(input: ExtractBatchInput): Promise<AiRowExtraction[]> {
    let res: Response;
    try {
      res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(input) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "crm_batch_extraction",
              schema: batchExtractionJsonSchema,
              strict: true,
            },
          },
        }),
      });
    } catch (err) {
      throw new LLMProviderError(`OpenAI request failed: ${(err as Error).message}`, err);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new LLMProviderError(`OpenAI returned ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new LLMProviderError("OpenAI response had no message content.");
    }

    try {
      const parsed = AiBatchResponseSchema.parse(JSON.parse(content));
      return parsed.rows;
    } catch (err) {
      throw new LLMProviderError(
        `OpenAI response failed schema validation: ${(err as Error).message}`,
        err
      );
    }
  }
}
