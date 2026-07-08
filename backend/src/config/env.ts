import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("*"),
  LLM_PROVIDER: z.enum(["anthropic", "openai", "gemini", "mock"]).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  BATCH_SIZE: z.coerce.number().default(25),
  BATCH_RETRY_ATTEMPTS: z.coerce.number().default(3),
  MAX_UPLOAD_MB: z.coerce.number().default(10),
});

export const env = EnvSchema.parse(process.env);
