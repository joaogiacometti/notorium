import { describe, expect, it } from "vitest";
import { isDirectImageUrl } from "@/lib/tiptap-image-url";

describe("isDirectImageUrl", () => {
  it("accepts an https image URL", () => {
    expect(isDirectImageUrl("https://example.com/image.png")).toBe(true);
  });

  it("accepts image URL with query and hash", () => {
    expect(
      isDirectImageUrl("https://cdn.example.com/photo.jpeg?size=large#anchor"),
    ).toBe(true);
  });

  it("rejects non-image URL", () => {
    expect(isDirectImageUrl("https://example.com/page")).toBe(false);
  });

  it("rejects unsupported protocol", () => {
    expect(isDirectImageUrl("ftp://example.com/image.png")).toBe(false);
  });

  it("rejects invalid URL", () => {
    expect(isDirectImageUrl("not-a-url")).toBe(false);
  });
});
