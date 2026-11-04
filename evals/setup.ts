import { wrapLanguageModel } from "ai";
import { vi } from "vitest";
import { recordUsageMiddleware } from "./assistant/usage-recorder";

// Evals must not spend a real user's allowance or touch the configured Redis.
vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: async () => ({ limited: false }),
}));

// The real provider, observed: UI message streams do not carry usage or cost.
vi.mock("@/lib/ai/provider", async (importOriginal) => {
  const provider = await importOriginal<typeof import("@/lib/ai/provider")>();
  return {
    getAiModel: (settings: Parameters<typeof provider.getAiModel>[0]) =>
      wrapLanguageModel({
        model: provider.getAiModel(settings),
        middleware: recordUsageMiddleware,
      }),
  };
});
