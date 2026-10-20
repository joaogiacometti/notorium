import "server-only";

import { getServerEnv } from "@/env";
import { AiConfigurationError } from "@/lib/ai/errors";

/** OpenRouter `reasoning.effort` levels; `none` turns thinking off. */
export type AiReasoningEffort = "none" | "minimal" | "low" | "medium" | "high";

// The assistant explains and makes flashcards, which needs no thinking, and
// thinking tokens are billed as output. A model whose reasoning is mandatory
// rejects `none`; set OPENROUTER_ASSISTANT_REASONING_EFFORT for it.
const DEFAULT_ASSISTANT_REASONING_EFFORT: AiReasoningEffort = "none";

export interface ResolvedAiSettings {
  provider: "openrouter";
  model: string;
  apiKey: string;
  /** Thinking level for study assistant replies; `none` unless configured. */
  assistantReasoningEffort: AiReasoningEffort;
}

export function resolveAiSettings(): ResolvedAiSettings | null {
  const env = getServerEnv();

  if (!env.OPENROUTER_API_KEY || !env.OPENROUTER_MODEL) {
    return null;
  }

  return {
    provider: "openrouter",
    model: env.OPENROUTER_MODEL,
    apiKey: env.OPENROUTER_API_KEY,
    assistantReasoningEffort:
      env.OPENROUTER_ASSISTANT_REASONING_EFFORT ??
      DEFAULT_ASSISTANT_REASONING_EFFORT,
  };
}

export function resolveRequiredAiSettings(): ResolvedAiSettings {
  const settings = resolveAiSettings();

  if (!settings) {
    throw new AiConfigurationError();
  }

  return settings;
}

export function isAiEnabled() {
  return resolveAiSettings() !== null;
}
