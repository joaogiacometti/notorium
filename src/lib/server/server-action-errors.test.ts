import { describe, expect, it } from "vitest";
import {
  actionError,
  resolveActionErrorMessage,
  t,
} from "@/lib/server/server-action-errors";

describe("t", () => {
  it("returns the error message for a known key", () => {
    expect(t("auth.loginFailed")).toBe("Login failed.");
  });

  it("returns the error message with params", () => {
    expect(t("limits.flashcardLimit", { max: "100" })).toBe(
      "System limit reached: you can have up to 100 flashcards per subject.",
    );
  });

  it("returns generic fallback for unknown key", () => {
    expect(t("unknown.key")).toBe("Something went wrong. Please try again.");
  });
});

describe("resolveActionErrorMessage", () => {
  it("returns the translated error message", () => {
    const result = resolveActionErrorMessage(actionError("auth.loginFailed"));

    expect(result).toBe("Login failed.");
  });

  it("returns error message with params", () => {
    const result = resolveActionErrorMessage(
      actionError("limits.flashcardLimit", { errorParams: { max: "50" } }),
    );

    expect(result).toBe(
      "System limit reached: you can have up to 50 flashcards per subject.",
    );
  });

  it("returns errorMessage if provided on actionError", () => {
    const result = resolveActionErrorMessage(
      actionError("auth.loginFailed", {
        errorMessage: "Custom message",
      }),
    );

    expect(result).toBe("Custom message");
  });
});
