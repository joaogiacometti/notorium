import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ResolvedUserAiSettings } from "@/features/ai/settings";

export function getUserAiModel(settings: ResolvedUserAiSettings | null) {
  if (!settings || settings.provider !== "openrouter") {
    return null;
  }

  const openRouterProvider = createOpenRouter({
    apiKey: settings.apiKey,
  });

  return openRouterProvider(settings.model);
}
