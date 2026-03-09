import { beforeEach, describe, expect, it, vi } from "vitest";

const selectLimitMock = vi.fn();
const selectWhereMock = vi.fn(() => ({
  limit: selectLimitMock,
}));
const selectFromMock = vi.fn(() => ({
  where: selectWhereMock,
}));
const selectMock = vi.fn(() => ({
  from: selectFromMock,
}));
const insertValuesMock = vi.fn(() => ({
  onConflictDoUpdate: vi.fn(),
}));
const insertMock = vi.fn(() => ({
  values: insertValuesMock,
}));
const updateWhereMock = vi.fn();
const updateSetMock = vi.fn(() => ({
  where: updateWhereMock,
}));
const updateMock = vi.fn(() => ({
  set: updateSetMock,
}));
const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({
  where: deleteWhereMock,
}));
const eqMock = vi.fn((column, value) => ({ column, value }));
const encryptSecretMock = vi.fn();
const decryptSecretMock = vi.fn();

vi.mock("@/db/index", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  userAiSettings: {
    userId: "user_id_column",
    model: "model_column",
    apiKeyLastFour: "api_key_last_four_column",
    apiKeyCiphertext: "ciphertext_column",
    apiKeyIv: "iv_column",
    apiKeyTag: "tag_column",
    provider: "provider_column",
  },
}));

vi.mock("@/lib/ai/crypto", () => ({
  encryptSecret: encryptSecretMock,
  decryptSecret: decryptSecretMock,
}));

describe("ai settings helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns only masked summary data and never plaintext api key", async () => {
    selectLimitMock.mockResolvedValueOnce([
      {
        model: "openai/gpt-4.1-mini",
        apiKeyLastFour: "1234",
      },
    ]);

    const { getUserAiSettingsSummary } = await import("@/features/ai/settings");

    const result = await getUserAiSettingsSummary("user-1");

    expect(result).toEqual({
      provider: "openrouter",
      model: "openai/gpt-4.1-mini",
      hasApiKey: true,
      apiKeyLastFour: "1234",
    });
    expect(JSON.stringify(result)).not.toContain("sk-or-v1");
    expect(decryptSecretMock).not.toHaveBeenCalled();
  });

  it("scopes summary reads by the authenticated user id", async () => {
    selectLimitMock.mockResolvedValueOnce([]);

    const { getUserAiSettingsSummary } = await import("@/features/ai/settings");

    await getUserAiSettingsSummary("user-42");

    expect(eqMock).toHaveBeenCalledWith("user_id_column", "user-42");
  });

  it("preserves the existing key suffix when only the model changes", async () => {
    selectLimitMock.mockResolvedValueOnce([
      {
        apiKeyLastFour: "5678",
      },
    ]);

    const { updateUserAiSettings } = await import("@/features/ai/settings");

    const result = await updateUserAiSettings("user-1", {
      model: "anthropic/claude-sonnet-4",
      apiKey: "",
    });

    expect(result).toEqual({
      provider: "openrouter",
      model: "anthropic/claude-sonnet-4",
      hasApiKey: true,
      apiKeyLastFour: "5678",
    });
    expect(updateMock).toHaveBeenCalled();
    expect(encryptSecretMock).not.toHaveBeenCalled();
  });

  it("clears settings using the provided user id", async () => {
    const { clearUserAiSettings } = await import("@/features/ai/settings");

    await clearUserAiSettings("user-clear");

    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith("user_id_column", "user-clear");
    expect(deleteWhereMock).toHaveBeenCalled();
  });

  it("classifies decrypt failures as stored credential errors", async () => {
    selectLimitMock.mockResolvedValueOnce([
      {
        provider: "openrouter",
        model: "openai/gpt-4.1-mini",
        apiKeyCiphertext: "bad",
        apiKeyIv: "bad",
        apiKeyTag: "bad",
      },
    ]);
    decryptSecretMock.mockImplementationOnce(() => {
      throw new Error("bad tag");
    });

    const { resolveUserAiSettings } = await import("@/features/ai/settings");

    await expect(resolveUserAiSettings("user-1")).rejects.toMatchObject({
      name: "AiStoredCredentialError",
      message: "Stored AI credentials are invalid",
    });
  });
});
