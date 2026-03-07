import { describe, expect, it } from "vitest";
import {
  isSupportedSharedImageUrl,
  resolveEmbeddableImageUrl,
} from "@/lib/tiptap-image-url";

describe("resolveEmbeddableImageUrl", () => {
  it("accepts an https image URL", () => {
    expect(resolveEmbeddableImageUrl("https://example.com/image.png")).toBe(
      "https://example.com/image.png",
    );
  });

  it("accepts image URL with query and hash", () => {
    expect(
      resolveEmbeddableImageUrl(
        "https://cdn.example.com/photo.jpeg?size=large#anchor",
      ),
    ).toBe("https://cdn.example.com/photo.jpeg?size=large#anchor");
  });

  it("rejects non-image URL", () => {
    expect(resolveEmbeddableImageUrl("https://example.com/page")).toBeNull();
  });

  it("rejects unsupported protocol", () => {
    expect(resolveEmbeddableImageUrl("ftp://example.com/image.png")).toBeNull();
  });

  it("rejects invalid URL", () => {
    expect(resolveEmbeddableImageUrl("not-a-url")).toBeNull();
  });
});

describe("isSupportedSharedImageUrl", () => {
  it("accepts imgur image page URLs", () => {
    expect(isSupportedSharedImageUrl("https://imgur.com/abc123")).toBe(true);
  });

  it("accepts mobile imgur image page URLs", () => {
    expect(isSupportedSharedImageUrl("https://m.imgur.com/abc123")).toBe(true);
  });

  it("rejects direct image URLs", () => {
    expect(isSupportedSharedImageUrl("https://i.imgur.com/abc123.png")).toBe(
      false,
    );
  });

  it("rejects album URLs", () => {
    expect(isSupportedSharedImageUrl("https://imgur.com/a/abc123")).toBe(false);
  });

  it("rejects gallery URLs", () => {
    expect(isSupportedSharedImageUrl("https://imgur.com/gallery/abc123")).toBe(
      false,
    );
  });
});
