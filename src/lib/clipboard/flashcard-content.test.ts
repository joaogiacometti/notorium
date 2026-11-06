import { testDocument } from "@/test/document";
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  copyFlashcardsToClipboard,
  formatFlashcardsAsMarkdown,
  NoFlashcardsToCopyError,
} from "@/lib/clipboard/flashcard-content";
import { FakeClipboard } from "@/test/fake-clipboard";

const atpCard = {
  front: testDocument("<p>What does <strong>ATP</strong> store?</p>"),
  back: testDocument("<ul><li><p>Chemical energy</p></li></ul>"),
  folderPath: "Biology::Cells",
};

const dnaCard = {
  front: testDocument("<p>What is DNA?</p>"),
  back: testDocument("<p>Genetic material</p>"),
  folderPath: "Biology::Genetics",
};

describe("formatFlashcardsAsMarkdown", () => {
  it("formats a single card as folder, front, and back", () => {
    expect(formatFlashcardsAsMarkdown([atpCard])).toBe(
      [
        "Folder: Biology::Cells",
        "### Front",
        "What does **ATP** store?",
        "### Back",
        "- Chemical energy",
      ].join("\n\n"),
    );
  });

  it("numbers several cards and separates them", () => {
    const markdown = formatFlashcardsAsMarkdown([atpCard, dnaCard]);

    expect(markdown).toBe(
      [
        "## Card 1",
        "Folder: Biology::Cells",
        "### Front",
        "What does **ATP** store?",
        "### Back",
        "- Chemical energy",
        "---",
        "## Card 2",
        "Folder: Biology::Genetics",
        "### Front",
        "What is DNA?",
        "### Back",
        "Genetic material",
      ].join("\n\n"),
    );
  });

  it("omits the folder line when the folder is unknown", () => {
    expect(formatFlashcardsAsMarkdown([{ ...dnaCard, folderPath: "" }])).toBe(
      "### Front\n\nWhat is DNA?\n\n### Back\n\nGenetic material",
    );
  });

  it("rejects an empty card list", () => {
    expect(() => formatFlashcardsAsMarkdown([])).toThrow(
      NoFlashcardsToCopyError,
    );
  });
});

describe("copyFlashcardsToClipboard", () => {
  let clipboard: FakeClipboard | null = null;

  afterEach(() => {
    clipboard?.uninstall();
    clipboard = null;
  });

  it("copies cards that are still loading and reports the count", async () => {
    clipboard = new FakeClipboard().install();

    const copiedCount = await copyFlashcardsToClipboard(
      Promise.resolve([atpCard, dnaCard]),
    );

    expect(copiedCount).toBe(2);
    expect(clipboard.lastText()).toBe(
      formatFlashcardsAsMarkdown([atpCard, dnaCard]),
    );
  });

  it("fails without writing when no cards are left to copy", async () => {
    clipboard = new FakeClipboard().install();

    await expect(copyFlashcardsToClipboard([])).rejects.toThrow(
      NoFlashcardsToCopyError,
    );
    expect(clipboard.writes).toEqual([]);
  });

  it("reports the content failure when the browser masks it", async () => {
    clipboard = new FakeClipboard().install({ maskItemErrors: true });

    await expect(
      copyFlashcardsToClipboard(Promise.resolve([])),
    ).rejects.toThrow(NoFlashcardsToCopyError);
  });

  it("keeps the browser's error when the content was fine", async () => {
    clipboard = new FakeClipboard().install({
      rejectWritesWith: new DOMException("Not focused", "NotAllowedError"),
    });

    await expect(copyFlashcardsToClipboard([dnaCard])).rejects.toThrow(
      "Not focused",
    );
  });
});
