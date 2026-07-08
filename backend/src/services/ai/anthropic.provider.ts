import Anthropic from "@anthropic-ai/sdk";
import { AiBatchResponseSchema, type AiRowExtraction } from "../../schemas/crm.schema";
import { batchExtractionJsonSchema } from "./jsonSchema";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import type { ExtractBatchInput, LLMProvider } from "./types";
import { LLMProviderError } from "./types";

const TOOL_NAME = "submit_crm_extraction";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = "claude-sonnet-5") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async extractBatch(input: ExtractBatchInput): Promise<AiRowExtraction[]> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(input) }],
        tools: [
          {
            name: TOOL_NAME,
            description: "Submit the structured CRM extraction for this batch of rows.",
            input_schema: batchExtractionJsonSchema as unknown as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: TOOL_NAME },
      });

      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      if (!toolUse) {
        throw new LLMProviderError("Anthropic response did not include a tool_use block.");
      }

      const parsed = AiBatchResponseSchema.parse(toolUse.input);
      return parsed.rows;
    } catch (err) {
      if (err instanceof LLMProviderError) throw err;
      throw new LLMProviderError(`Anthropic extraction failed: ${(err as Error).message}`, err);
    }
  }
}
