import type { LanguageModelMiddleware } from "ai";

export interface ModelUsage {
  modelCalls: number;
  inputTokens: number;
  outputTokens: number;
  /** USD reported by OpenRouter; null when a model call did not report it. */
  cost: number | null;
}

const emptyUsage = (): ModelUsage => ({
  modelCalls: 0,
  inputTokens: 0,
  outputTokens: 0,
  cost: 0,
});

let current = emptyUsage();

/** Usage since the previous call; evals in one file run one at a time. */
export function takeModelUsage(): ModelUsage {
  const usage = current;
  current = emptyUsage();
  return usage;
}

export const recordUsageMiddleware: LanguageModelMiddleware = {
  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream();
    return {
      ...rest,
      stream: stream.pipeThrough(
        new TransformStream({
          transform(part, controller) {
            if (part.type === "finish") {
              const usage = part.providerMetadata?.openrouter?.usage as
                | { cost?: number }
                | undefined;
              const cost = usage?.cost ?? null;
              current.modelCalls += 1;
              current.inputTokens += part.usage.inputTokens.total ?? 0;
              current.outputTokens += part.usage.outputTokens.total ?? 0;
              current.cost =
                current.cost === null || cost === null
                  ? null
                  : current.cost + cost;
            }
            controller.enqueue(part);
          },
        }),
      ),
    };
  },
};
