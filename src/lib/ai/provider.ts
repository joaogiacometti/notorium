import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ResolvedAiSettings } from "@/lib/ai/config";

/**
 * The configured OpenRouter model, with the instance thinking level applied
 * to every call made through it.
 *
 * @example
 * await generateText({ model: getAiModel(settings), prompt: "Hi" });
 */
export function getAiModel(settings: ResolvedAiSettings) {
  const openRouterProvider = createOpenRouter({ apiKey: settings.apiKey });

  return openRouterProvider(settings.model, {
    reasoning: { effort: settings.reasoningEffort },
  });
}
