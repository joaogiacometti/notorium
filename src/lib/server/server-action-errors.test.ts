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

  it("returns deck move error messages", () => {
    expect(t("decks.cannotMoveIntoSelf")).toBe(
      "A deck cannot be moved into itself.",
    );
    expect(t("decks.wouldCreateCycle")).toBe(
      "This move would create a circular deck hierarchy.",
    );
    expect(t("limits.childDeckLimit", { max: 3 })).toBe(
      "System limit reached: a deck can have up to 3 child decks.",
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

  it("returns errorMessage if provided on actionError", () => {
    const result = resolveActionErrorMessage(
      actionError("auth.loginFailed", {
        errorMessage: "Custom message",
      }),
    );

    expect(result).toBe("Custom message");
  });
});
