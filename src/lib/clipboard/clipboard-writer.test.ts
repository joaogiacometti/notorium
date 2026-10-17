// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  canWriteClipboardItems,
  writePendingTextToClipboard,
} from "@/lib/clipboard/clipboard-writer";
import { FakeClipboard } from "@/test/fake-clipboard";

describe("clipboard writer", () => {
  let clipboard: FakeClipboard | null = null;

  afterEach(() => {
    clipboard?.uninstall();
    clipboard = null;
  });

  it("reports ClipboardItem support", () => {
    clipboard = new FakeClipboard().install();
    expect(canWriteClipboardItems()).toBe(true);

    clipboard.install({ clipboardItems: false });
    expect(canWriteClipboardItems()).toBe(false);
  });

  it("writes pending text through a ClipboardItem when supported", async () => {
    clipboard = new FakeClipboard().install();

    await writePendingTextToClipboard(Promise.resolve("Card text"));

    expect(clipboard.writes).toEqual([{ via: "write", text: "Card text" }]);
  });

  it("waits for the text and falls back to writeText without ClipboardItem", async () => {
    clipboard = new FakeClipboard().install({ clipboardItems: false });

    await writePendingTextToClipboard(Promise.resolve("Card text"));

    expect(clipboard.writes).toEqual([{ via: "writeText", text: "Card text" }]);
  });

  it("rejects without writing when the text fails to load", async () => {
    clipboard = new FakeClipboard().install();

    await expect(
      writePendingTextToClipboard(Promise.reject(new Error("offline"))),
    ).rejects.toThrow("offline");
    expect(clipboard.writes).toEqual([]);
  });
});
