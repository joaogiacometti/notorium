import { beforeEach, describe, expect, it, vi } from "vitest";

const base64Key = Buffer.alloc(32, 7).toString("base64");

describe("ai crypto", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.USER_AI_SETTINGS_ENCRYPTION_KEY = base64Key;
    process.env.SKIP_ENV_VALIDATION = "1";
  });

  it("round-trips encrypted secrets", async () => {
    const { decryptSecret, encryptSecret } = await import("@/lib/ai/crypto");

    const encrypted = encryptSecret("sk-or-v1-test-secret");

    expect(decryptSecret(encrypted)).toBe("sk-or-v1-test-secret");
  });

  it("uses a different iv and ciphertext for repeated encryptions", async () => {
    const { encryptSecret } = await import("@/lib/ai/crypto");

    const first = encryptSecret("sk-or-v1-test-secret");
    const second = encryptSecret("sk-or-v1-test-secret");

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });
});
