import { describe, expect, it } from "vitest";
import {
  getPastedImageFile,
  getPastedImageFileName,
} from "@/lib/editor/clipboard-image";

class FakeClipboardItem {
  constructor(
    readonly kind: string,
    private readonly file: File | null,
  ) {}

  getAsFile(): File | null {
    return this.file;
  }
}

function fakePasteEvent(items: FakeClipboardItem[]): ClipboardEvent {
  return { clipboardData: { items } } as unknown as ClipboardEvent;
}

describe("getPastedImageFile", () => {
  it("returns the first image file in the clipboard", () => {
    const image = new File(["png-bytes"], "shot.png", { type: "image/png" });
    const event = fakePasteEvent([
      new FakeClipboardItem("string", null),
      new FakeClipboardItem("file", image),
    ]);

    expect(getPastedImageFile(event)).toBe(image);
  });

  it("ignores non-image files", () => {
    const pdf = new File(["pdf"], "doc.pdf", { type: "application/pdf" });
    const event = fakePasteEvent([new FakeClipboardItem("file", pdf)]);

    expect(getPastedImageFile(event)).toBeNull();
  });

  it("returns null when the clipboard has no items", () => {
    const event = { clipboardData: null } as unknown as ClipboardEvent;

    expect(getPastedImageFile(event)).toBeNull();
  });
});

describe("getPastedImageFileName", () => {
  it("keeps the original file name when present", () => {
    const file = new File([""], "diagram.jpeg", { type: "image/jpeg" });

    expect(getPastedImageFileName(file)).toBe("diagram.jpeg");
  });

  it("derives a name from the MIME type for unnamed clipboard images", () => {
    const file = new File([""], "  ", { type: "image/png" });

    expect(getPastedImageFileName(file)).toBe("pasted-image.png");
  });
});
