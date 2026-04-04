import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { userAiSettings } from "@/db/schema";
import { encryptSecret } from "@/lib/ai/crypto";
import type { UserAiSettingsSummary } from "@/lib/server/api-contracts";

export async function saveUserAiSettings(
  userId: string,
  input: {
    model: string;
    apiKey: string;
  },
): Promise<UserAiSettingsSummary> {
  const encryptedApiKey = encryptSecret(input.apiKey);
  const apiKeyLastFour = input.apiKey.slice(-4);

  await getDb()
    .insert(userAiSettings)
    .values({
      userId,
      provider: "openrouter",
      model: input.model,
      apiKeyCiphertext: encryptedApiKey.ciphertext,
      apiKeyIv: encryptedApiKey.iv,
      apiKeyTag: encryptedApiKey.tag,
      apiKeyLastFour,
    })
    .onConflictDoUpdate({
      target: userAiSettings.userId,
      set: {
        provider: "openrouter",
        model: input.model,
        apiKeyCiphertext: encryptedApiKey.ciphertext,
        apiKeyIv: encryptedApiKey.iv,
        apiKeyTag: encryptedApiKey.tag,
        apiKeyLastFour,
        updatedAt: new Date(),
      },
    });

  return {
    provider: "openrouter",
    model: input.model,
    hasApiKey: true,
    apiKeyLastFour,
  };
}

export async function updateUserAiSettings(
  userId: string,
  input: {
    model: string;
    apiKey: string;
  },
): Promise<UserAiSettingsSummary | null> {
  const [existing] = await getDb()
    .select({
      apiKeyLastFour: userAiSettings.apiKeyLastFour,
    })
    .from(userAiSettings)
    .where(eq(userAiSettings.userId, userId))
    .limit(1);

  if (!existing && input.apiKey.length === 0) {
    return null;
  }

  if (input.apiKey.length === 0 && existing) {
    await getDb()
      .update(userAiSettings)
      .set({
        model: input.model,
        updatedAt: new Date(),
      })
      .where(eq(userAiSettings.userId, userId));

    return {
      provider: "openrouter",
      model: input.model,
      hasApiKey: true,
      apiKeyLastFour: existing.apiKeyLastFour,
    };
  }

  return saveUserAiSettings(userId, {
    model: input.model,
    apiKey: input.apiKey,
  });
}

export async function clearUserAiSettings(userId: string) {
  await getDb().delete(userAiSettings).where(eq(userAiSettings.userId, userId));
}
