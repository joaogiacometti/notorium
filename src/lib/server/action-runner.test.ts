import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const getAuthenticatedUserIdMock = vi.fn();

vi.mock("@/lib/auth/auth", () => ({
  getAuthenticatedUserId: getAuthenticatedUserIdMock,
}));

describe("action runner", () => {
  it("returns an action error when input is invalid", async () => {
    const { runValidatedAction } = await import("@/lib/server/action-runner");
    const action = vi.fn();

    const result = await runValidatedAction(
      z.object({
        title: z.string().min(1),
      }),
      { title: "" },
      "assessments.invalidData",
      action,
    );

    expect(result).toEqual({
      success: false,
      errorCode: "assessments.invalidData",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(action).not.toHaveBeenCalled();
  });

  it("calls the action with parsed input when valid", async () => {
    const { runValidatedAction } = await import("@/lib/server/action-runner");
    const action = vi.fn(async (data: { title: string }) => ({
      success: true as const,
      title: data.title,
    }));

    const result = await runValidatedAction(
      z.object({
        title: z.string().min(1),
      }),
      { title: "Midterm" },
      "assessments.invalidData",
      action,
    );

    expect(result).toEqual({
      success: true,
      title: "Midterm",
    });
    expect(action).toHaveBeenCalledWith({ title: "Midterm" });
  });

  it("returns an action error for invalid user action input", async () => {
    getAuthenticatedUserIdMock.mockResolvedValueOnce("user-1");
    const { runValidatedUserAction } = await import(
      "@/lib/server/action-runner"
    );
    const action = vi.fn();

    const result = await runValidatedUserAction(
      z.object({
        id: z.string().min(1),
      }),
      { id: "" },
      "common.invalidRequest",
      action,
    );

    expect(result).toEqual({
      success: false,
      errorCode: "common.invalidRequest",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(action).not.toHaveBeenCalled();
  });

  it("passes user id and parsed data to user action", async () => {
    getAuthenticatedUserIdMock.mockResolvedValueOnce("user-42");
    const { runValidatedUserAction } = await import(
      "@/lib/server/action-runner"
    );
    const action = vi.fn(async (userId: string, data: { id: string }) => ({
      success: true as const,
      userId,
      id: data.id,
    }));

    const result = await runValidatedUserAction(
      z.object({
        id: z.string().min(1),
      }),
      { id: "note-1" },
      "common.invalidRequest",
      action,
    );

    expect(result).toEqual({
      success: true,
      userId: "user-42",
      id: "note-1",
    });
    expect(action).toHaveBeenCalledWith("user-42", { id: "note-1" });
  });
});
