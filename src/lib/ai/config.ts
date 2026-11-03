import "server-only";

import { getServerEnv } from "@/env";

/** OpenRouter `reasoning.effort` levels; `none` turns thinking off. */
export type AiReasoningEffort = NonNullable<
  ReturnType<typeof getServerEnv>["OPENROUTER_REASONING_EFFORT"]
>;

// No AI feature needs thinking: its tokens are billed as output and count
// against each call's small `maxOutputTokens`, so a thinking model can cut the
// answer short. A model whose reasoning is mandatory rejects `none`; set
// OPENROUTER_REASONING_EFFORT for it.
const DEFAULT_REASONING_EFFORT: AiReasoningEffort = "none";

export interface ResolvedAiSettings {
  model: string;
  apiKey: string;
  /** Thinking level for every AI call; `none` unless configured. */
  reasoningEffort: AiReasoningEffort;
}

/** Instance AI settings from the environment. */
export function resolveAiSettings(): ResolvedAiSettings {
  const env = getServerEnv();

  return {
    model: env.OPENROUTER_MODEL,
    apiKey: env.OPENROUTER_API_KEY,
    reasoningEffort:
      env.OPENROUTER_REASONING_EFFORT ?? DEFAULT_REASONING_EFFORT,
  };
}
