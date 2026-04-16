import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ResolvedUserAiSettings } from "@/features/ai/queries";
import { AiConfigurationError } from "@/lib/ai/errors";

export function getUserAiModel(settings: ResolvedUserAiSettings | null) {
  if (!settings || settings.provider !== "openrouter") {
    return null;
  }

  const openRouterProvider = createOpenRouter({
    apiKey: settings.apiKey,
  });

  return openRouterProvider(settings.model);
}

export function getUserAiModelOrThrow(settings: ResolvedUserAiSettings) {
  const model = getUserAiModel(settings);

  if (!model) {
    throw new AiConfigurationError();
  }

  return model;
}
