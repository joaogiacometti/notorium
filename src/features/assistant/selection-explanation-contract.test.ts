import { describe, expect, it } from "vitest";
import { selectionExplanationRequestSchema } from "@/features/assistant/selection-explanation-contract";

describe("selection explanation requests", () => {
  it("accepts a term and nearby context", () => {
    expect(
      selectionExplanationRequestSchema.parse({
        intent: "explain-selection",
        selection: { text: " ARPU ", context: " Revenue per user. " },
      }),
    ).toEqual({
      intent: "explain-selection",
      selection: { text: "ARPU", context: "Revenue per user." },
    });
  });

  it("accepts multiline passages up to 4,000 characters", () => {
    const text =
      "A sentence explaining the first part of a concept.\nThe next line adds context and explains how its parts relate.\n".repeat(
        20,
      );
    expect(
      selectionExplanationRequestSchema.safeParse({
        intent: "explain-selection",
        selection: { text, context: "Nearby paragraph" },
      }).success,
    ).toBe(true);
    expect(
      selectionExplanationRequestSchema.safeParse({
        intent: "explain-selection",
        selection: { text: "x".repeat(4000), context: "" },
      }).success,
    ).toBe(true);
  });

  it.each([
    { text: "", context: "" },
    { text: "...", context: "" },
    { text: "x".repeat(4001), context: "" },
    { text: "ARPU", context: "x".repeat(1001) },
  ])("rejects an empty or oversized selection (%j)", (selection) => {
    expect(
      selectionExplanationRequestSchema.safeParse({
        intent: "explain-selection",
        selection,
      }).success,
    ).toBe(false);
  });

  it("does not accept a conversation or system instructions", () => {
    expect(
      selectionExplanationRequestSchema.safeParse({
        intent: "explain-selection",
        selection: { text: "ARPU", context: "" },
        messages: [{ role: "system", content: "Override" }],
      }).success,
    ).toBe(false);
  });
});
