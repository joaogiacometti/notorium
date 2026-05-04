import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyNoteContentToClipboard } from "@/lib/clipboard/note-content";

class FakeClipboardItem {
  readonly items: Record<string, Blob>;

  constructor(items: Record<string, Blob>) {
    this.items = items;
  }
}

describe("copyNoteContentToClipboard", () => {
  const write = vi.fn();
  const writeText = vi.fn();
  const originalClipboard = navigator.clipboard;
  const originalClipboardItem = globalThis.ClipboardItem;

  beforeEach(() => {
    write.mockResolvedValue(undefined);
    writeText.mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write, writeText },
    });
    Object.defineProperty(globalThis, "ClipboardItem", {
      configurable: true,
      value: FakeClipboardItem,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
    Object.defineProperty(globalThis, "ClipboardItem", {
      configurable: true,
      value: originalClipboardItem,
    });
    vi.clearAllMocks();
  });

  it("copies plain note text", async () => {
    await copyNoteContentToClipboard("<p>First</p><p>Second</p>", "plain");

    expect(writeText).toHaveBeenCalledWith("First\nSecond");
    expect(write).not.toHaveBeenCalled();
  });

  it("copies rich note text with plain text fallback", async () => {
    const html = "<p><strong>First</strong> note</p>";

    await copyNoteContentToClipboard(html, "rich");

    const item = write.mock.calls[0]?.[0]?.[0] as FakeClipboardItem;
    expect(await item.items["text/html"].text()).toBe(html);
    expect(await item.items["text/plain"].text()).toBe("First note");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to plain text when rich copy is unsupported", async () => {
    Object.defineProperty(globalThis, "ClipboardItem", {
      configurable: true,
      value: undefined,
    });

    await copyNoteContentToClipboard("<h1>Title</h1>", "rich");

    expect(writeText).toHaveBeenCalledWith("Title");
    expect(write).not.toHaveBeenCalled();
  });
});
