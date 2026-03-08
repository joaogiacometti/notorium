import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseActionInput } from "@/lib/action-input";

describe("parseActionInput", () => {
  it("returns parsed data when the input is valid", () => {
    const result = parseActionInput(
      z.object({
        title: z.string().min(1),
      }),
      { title: "Midterm" },
      "assessments.invalidData",
    );

    expect(result).toEqual({
      success: true,
      data: {
        title: "Midterm",
      },
    });
  });

  it("returns an action error when the input is invalid", () => {
    const result = parseActionInput(
      z.object({
        title: z.string().min(1),
      }),
      { title: "" },
      "assessments.invalidData",
    );

    expect(result).toEqual({
      success: false,
      error: {
        success: false,
        errorCode: "assessments.invalidData",
        errorParams: undefined,
        errorMessage: undefined,
      },
    });
  });
});
