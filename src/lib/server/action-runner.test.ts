import { redirect } from "next/navigation";
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
      "test.action",
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
      "test.action",
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
    const { runValidatedUserAction } = await import(
      "@/lib/server/action-runner"
    );
    const action = vi.fn();

    const result = await runValidatedUserAction(
      "test.action",
      z.object({
        id: z.string().min(1),
      }),
      { id: "" },
      "ServerErrors.common.invalidRequest",
      action,
    );

    expect(result).toEqual({
      success: false,
      errorCode: "ServerErrors.common.invalidRequest",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(action).not.toHaveBeenCalled();
    expect(getAuthenticatedUserIdMock).not.toHaveBeenCalled();
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
      "test.action",
      z.object({
        id: z.string().min(1),
      }),
      { id: "note-1" },
      "ServerErrors.common.invalidRequest",
      action,
    );

    expect(result).toEqual({
      success: true,
      userId: "user-42",
      id: "note-1",
    });
    expect(action).toHaveBeenCalledWith("user-42", { id: "note-1" });
  });

  it("returns a generic error and logs the action scope when a user action throws", async () => {
    getAuthenticatedUserIdMock.mockResolvedValueOnce("user-42");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { runValidatedUserAction } = await import(
      "@/lib/server/action-runner"
    );

    const result = await runValidatedUserAction(
      "notes.editNote",
      z.object({ id: z.string().min(1) }),
      { id: "note-1" },
      "notes.invalidData",
      async () => {
        throw new Error('Failed query: select ... params: "secret note"');
      },
    );

    expect(result).toMatchObject({
      success: false,
      errorCode: "common.generic",
    });
    expect(
      JSON.parse(String(consoleErrorSpy.mock.calls[0]?.[0])),
    ).toMatchObject({ event: "server_action_failed", scope: "notes.editNote" });
  });

  it("returns a generic error when an unauthenticated action throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { runValidatedAction } = await import("@/lib/server/action-runner");

    const result = await runValidatedAction(
      "auth.loginAction",
      z.object({ email: z.string().min(1) }),
      { email: "ada@example.com" },
      "auth.invalidInput",
      async () => {
        throw new Error("redis unavailable");
      },
    );

    expect(result).toMatchObject({
      success: false,
      errorCode: "common.generic",
    });
  });

  it("returns a generic error when the session lookup fails", async () => {
    getAuthenticatedUserIdMock.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { runValidatedUserAction } = await import(
      "@/lib/server/action-runner"
    );
    const action = vi.fn();

    const result = await runValidatedUserAction(
      "notes.editNote",
      z.object({ id: z.string().min(1) }),
      { id: "note-1" },
      "notes.invalidData",
      action,
    );

    expect(result).toMatchObject({ errorCode: "common.generic" });
    expect(action).not.toHaveBeenCalled();
  });

  it("lets the unauthenticated redirect to /login propagate", async () => {
    getAuthenticatedUserIdMock.mockImplementationOnce(async () =>
      redirect("/login"),
    );
    const { runValidatedUserAction } = await import(
      "@/lib/server/action-runner"
    );

    await expect(
      runValidatedUserAction(
        "notes.editNote",
        z.object({ id: z.string().min(1) }),
        { id: "note-1" },
        "notes.invalidData",
        vi.fn(),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
  });
});
