import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ResolvedAiSettings } from "@/lib/ai/config";
import { AiConfigurationError } from "@/lib/ai/errors";

export function getAiModel(settings: ResolvedAiSettings | null) {
  if (!settings || settings.provider !== "openrouter") {
    return null;
  }

  const openRouterProvider = createOpenRouter({
    apiKey: settings.apiKey,
  });

  return openRouterProvider(settings.model);
}

export function getAiModelOrThrow(settings: ResolvedAiSettings) {
  const model = getAiModel(settings);

  if (!model) {
    throw new AiConfigurationError();
  }

  return model;
}
