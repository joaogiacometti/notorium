import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { userAiSettings } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/ai/crypto";
import { AiConfigurationError, AiStoredCredentialError } from "@/lib/ai/errors";
import type { UserAiSettingsSummary } from "@/lib/server/api-contracts";

export interface ResolvedUserAiSettings {
  provider: "openrouter";
  model: string;
  apiKey: string;
}

function toSummary(
  settings: {
    model: string;
    apiKeyLastFour: string;
  } | null,
): UserAiSettingsSummary | null {
  if (!settings) {
    return null;
  }

  return {
    provider: "openrouter",
    model: settings.model,
    hasApiKey: true,
    apiKeyLastFour: settings.apiKeyLastFour,
  };
}

export async function getUserAiSettingsSummary(
  userId: string,
): Promise<UserAiSettingsSummary | null> {
  const [settings] = await getDb()
    .select({
      model: userAiSettings.model,
      apiKeyLastFour: userAiSettings.apiKeyLastFour,
    })
    .from(userAiSettings)
    .where(eq(userAiSettings.userId, userId))
    .limit(1);

  return toSummary(settings ?? null);
}

export async function resolveUserAiSettings(
  userId: string,
): Promise<ResolvedUserAiSettings | null> {
  const [settings] = await getDb()
    .select()
    .from(userAiSettings)
    .where(eq(userAiSettings.userId, userId))
    .limit(1);

  if (!settings) {
    return null;
  }

  let apiKey: string;

  try {
    apiKey = decryptSecret({
      ciphertext: settings.apiKeyCiphertext,
      iv: settings.apiKeyIv,
      tag: settings.apiKeyTag,
    });
  } catch {
    throw new AiStoredCredentialError();
  }

  return {
    provider: settings.provider,
    model: settings.model,
    apiKey,
  };
}

export async function resolveRequiredUserAiSettings(
  userId: string,
): Promise<ResolvedUserAiSettings> {
  try {
    const settings = await resolveUserAiSettings(userId);

    if (!settings) {
      throw new AiConfigurationError();
    }

    return settings;
  } catch (error) {
    if (
      error instanceof AiConfigurationError ||
      error instanceof AiStoredCredentialError
    ) {
      throw error;
    }
    throw error;
  }
}

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
