// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { copyFlashcardsWithToast } from "@/components/flashcards/shared/copy-flashcards-with-toast";
import { FakeClipboard } from "@/test/fake-clipboard";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("sonner", () => ({ toast: toastMock }));

const card = {
  front: "<p>What is ATP?</p>",
  back: "<p>Energy</p>",
  subjectPath: "Biology",
};

describe("copyFlashcardsWithToast", () => {
  let clipboard: FakeClipboard | null = null;

  afterEach(() => {
    clipboard?.uninstall();
    clipboard = null;
    vi.clearAllMocks();
  });

  it("confirms one or several copied cards", async () => {
    clipboard = new FakeClipboard().install();

    await copyFlashcardsWithToast([card]);
    await copyFlashcardsWithToast(Promise.resolve([card, card]));

    expect(toastMock.success.mock.calls).toEqual([
      ["Flashcard copied."],
      ["2 flashcards copied."],
    ]);
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("says the cards are gone when none are left to copy", async () => {
    clipboard = new FakeClipboard().install({ maskItemErrors: true });

    await copyFlashcardsWithToast(Promise.resolve([]));

    expect(toastMock.error).toHaveBeenCalledWith(
      "These flashcards no longer exist.",
    );
    expect(clipboard.writes).toEqual([]);
  });

  it("reports a generic failure when loading or writing fails", async () => {
    clipboard = new FakeClipboard().install();

    await copyFlashcardsWithToast(Promise.reject(new Error("offline")));

    expect(toastMock.error).toHaveBeenCalledWith("Could not copy flashcards.");
    expect(toastMock.success).not.toHaveBeenCalled();
  });
});
