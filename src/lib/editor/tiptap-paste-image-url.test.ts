import { describe, expect, it, vi } from "vitest";
import { resolvePastedImageUrl } from "@/lib/editor/tiptap-paste-image-url";

describe("resolvePastedImageUrl", () => {
  it("handles direct image urls immediately", async () => {
    await expect(
      resolvePastedImageUrl(" https://example.com/image.png "),
    ).resolves.toEqual({
      handled: true,
      imageUrl: "https://example.com/image.png",
      fallbackText: null,
    });
  });

  it("rejects unsupported urls", async () => {
    await expect(
      resolvePastedImageUrl("https://example.com/page"),
    ).resolves.toEqual({
      handled: false,
      imageUrl: null,
      fallbackText: null,
    });
  });

  it("resolves supported shared image urls", async () => {
    const resolveSharedImageUrl = vi
      .fn<(value: string) => Promise<string | null>>()
      .mockResolvedValue("https://i.imgur.com/abc123.png");

    await expect(
      resolvePastedImageUrl("https://imgur.com/abc123", resolveSharedImageUrl),
    ).resolves.toEqual({
      handled: true,
      imageUrl: "https://i.imgur.com/abc123.png",
      fallbackText: null,
    });

    expect(resolveSharedImageUrl).toHaveBeenCalledWith(
      "https://imgur.com/abc123",
    );
  });

  it("falls back to plain text when shared image resolution returns null", async () => {
    const resolveSharedImageUrl = vi
      .fn<(value: string) => Promise<string | null>>()
      .mockResolvedValue(null);

    await expect(
      resolvePastedImageUrl("https://imgur.com/abc123", resolveSharedImageUrl),
    ).resolves.toEqual({
      handled: true,
      imageUrl: null,
      fallbackText: "https://imgur.com/abc123",
    });
  });

  it("falls back to plain text when shared image resolution fails", async () => {
    const resolveSharedImageUrl = vi
      .fn<(value: string) => Promise<string | null>>()
      .mockRejectedValue(new Error("network"));

    await expect(
      resolvePastedImageUrl("https://imgur.com/abc123", resolveSharedImageUrl),
    ).resolves.toEqual({
      handled: true,
      imageUrl: null,
      fallbackText: "https://imgur.com/abc123",
    });
  });
});
