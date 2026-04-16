import "server-only";

import { getServerEnv } from "@/env";
import { AiConfigurationError } from "@/lib/ai/errors";

export interface ResolvedAiSettings {
  provider: "openrouter";
  model: string;
  apiKey: string;
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
