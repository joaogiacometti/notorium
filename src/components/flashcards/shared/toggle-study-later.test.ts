import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setFlashcardStudyLater } from "@/app/actions/flashcards";
import { toggleStudyLater } from "@/components/flashcards/shared/toggle-study-later";

vi.mock("@/app/actions/flashcards", () => ({
  setFlashcardStudyLater: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const setFlashcardStudyLaterMock = vi.mocked(setFlashcardStudyLater);

describe("toggleStudyLater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks an unmarked card and hands back the saved mark", async () => {
    const markedAt = new Date("2026-10-30T10:00:00.000Z");
    setFlashcardStudyLaterMock.mockResolvedValue({
      success: true,
      studyLaterAt: markedAt,
    });
    const onSaved = vi.fn();

    await toggleStudyLater({ id: "card-1", studyLaterAt: null }, onSaved);

    expect(setFlashcardStudyLaterMock).toHaveBeenCalledWith({
      id: "card-1",
      studyLater: true,
    });
    expect(onSaved).toHaveBeenCalledWith(markedAt);
  });

  it("unmarks a marked card", async () => {
    setFlashcardStudyLaterMock.mockResolvedValue({
      success: true,
      studyLaterAt: null,
    });
    const onSaved = vi.fn();

    await toggleStudyLater({ id: "card-1", studyLaterAt: new Date() }, onSaved);

    expect(setFlashcardStudyLaterMock).toHaveBeenCalledWith({
      id: "card-1",
      studyLater: false,
    });
    expect(onSaved).toHaveBeenCalledWith(null);
  });

  it("toasts and skips onSaved when the save fails or throws", async () => {
    setFlashcardStudyLaterMock
      .mockResolvedValueOnce({
        success: false,
        errorCode: "flashcards.notFound",
      })
      .mockRejectedValueOnce(new Error("offline"));
    const onSaved = vi.fn();

    await toggleStudyLater({ id: "card-1", studyLaterAt: null }, onSaved);
    await toggleStudyLater({ id: "card-1", studyLaterAt: null }, onSaved);

    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(onSaved).not.toHaveBeenCalled();
  });
});
