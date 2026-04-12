import { describe, expect, it } from "vitest";
import { resolveEmbeddableImageUrl } from "@/lib/editor/tiptap-image-url";

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

  it("rejects shared page URLs", () => {
    expect(resolveEmbeddableImageUrl("https://example.com/abc123")).toBeNull();
  });

  it("rejects unsupported protocol", () => {
    expect(resolveEmbeddableImageUrl("ftp://example.com/image.png")).toBeNull();
  });

  it("rejects invalid URL", () => {
    expect(resolveEmbeddableImageUrl("not-a-url")).toBeNull();
  });

  it("rejects relative image filenames", () => {
    expect(resolveEmbeddableImageUrl("cisco_switch.jpg")).toBeNull();
  });
});
