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

  it("sanitizes rich note HTML before copying", async () => {
    await copyNoteContentToClipboard(
      '<p>Safe</p><img src="x" onerror="alert(1)"><script>alert(2)</script>',
      "rich",
    );

    const item = write.mock.calls[0]?.[0]?.[0] as FakeClipboardItem;
    expect(await item.items["text/html"].text()).toBe(
      '<p>Safe</p><img src="x">',
    );
    expect(await item.items["text/plain"].text()).toBe("Safe");
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

  it("decodes HTML entities in plain text output", async () => {
    await copyNoteContentToClipboard(
      "<p>a &amp; b &lt;c&gt; &quot;d&quot;</p>",
      "plain",
    );

    expect(writeText).toHaveBeenCalledWith('a & b <c> "d"');
  });

  it("strips inline formatting tags from plain text output", async () => {
    await copyNoteContentToClipboard(
      "<p><strong>Bold</strong> and <em>italic</em> text</p>",
      "plain",
    );

    expect(writeText).toHaveBeenCalledWith("Bold and italic text");
  });

  it("converts br tags and block elements to newlines", async () => {
    await copyNoteContentToClipboard(
      "<p>Line one</p><br><p>Line two</p>",
      "plain",
    );

    expect(writeText).toHaveBeenCalledWith("Line one\nLine two");
  });

  it("surfaces inline and block math as LaTeX in plain text", async () => {
    await copyNoteContentToClipboard(
      '<p>Area <span data-type="inline-math" data-latex="A = \\pi r^2"></span></p>' +
        '<div data-type="block-math" data-latex="F = ma"></div>',
      "plain",
    );

    expect(writeText).toHaveBeenCalledWith("Area $A = \\pi r^2$\n$$F = ma$$");
  });
});
