import { describe, expect, it, vi } from "vitest";
import {
  actionError,
  resolveActionErrorMessage,
} from "@/lib/server/server-action-errors";

describe("resolveActionErrorMessage", () => {
  it("returns the translated error when available", () => {
    const result = resolveActionErrorMessage(
      actionError("auth.loginFailed"),
      vi.fn((key) => key),
    );

    expect(result).toBe("auth.loginFailed");
  });

  it("falls back to the generic translation instead of raw backend text", () => {
    const t = vi.fn((key: string) => {
      if (key === "auth.loginFailed") {
        throw new Error("missing translation");
      }

      return key;
    });

    const result = resolveActionErrorMessage(
      actionError("auth.loginFailed", {
        errorMessage: "Backend said the password hash is invalid",
      }),
      t,
    );

    expect(result).toBe("common.generic");
    expect(t).toHaveBeenNthCalledWith(1, "auth.loginFailed", undefined);
    expect(t).toHaveBeenNthCalledWith(2, "common.generic");
  });
});
