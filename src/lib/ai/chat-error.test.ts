import { describe, expect, it } from "vitest";
import { readAssistantErrorMessage } from "@/lib/ai/chat-error";

describe("readAssistantErrorMessage", () => {
  it("resolves the route's error code to its message", () => {
    const error = new Error(
      JSON.stringify({ success: false, errorCode: "limits.aiAssistantPerDay" }),
    );

    expect(readAssistantErrorMessage(error)).toBe(
      "Daily limit reached for the assistant.",
    );
  });

  it("falls back to the generic message for network errors", () => {
    expect(readAssistantErrorMessage(new Error("Failed to fetch"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
