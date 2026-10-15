import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSubjectOptions } from "@/components/shared/load-subject-options";

const { fetchSubjectOptionsMock, toastErrorMock } = vi.hoisted(() => ({
  fetchSubjectOptionsMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/read-api/subjects", () => ({
  fetchSubjectOptions: fetchSubjectOptionsMock,
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

describe("loadSubjectOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the fetched subjects", async () => {
    fetchSubjectOptionsMock.mockResolvedValueOnce([{ id: "s1" }]);

    await expect(loadSubjectOptions()).resolves.toEqual([{ id: "s1" }]);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("toasts and resolves null instead of rejecting", async () => {
    fetchSubjectOptionsMock.mockRejectedValueOnce(new Error("network down"));

    await expect(loadSubjectOptions()).resolves.toBeNull();
    expect(toastErrorMock).toHaveBeenCalledWith("Could not load subjects.");
  });
});
