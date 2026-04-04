import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { userAiSettings } from "@/db/schema";
import { decryptSecret } from "@/lib/ai/crypto";
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
