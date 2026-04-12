import { describe, expect, it, vi } from "vitest";
import {
  countInternalAttachmentImages,
  getRichTextExcerpt,
  hasRichTextContent,
  normalizeRichTextForRendering,
  normalizeRichTextForUniqueness,
  removeInternalAttachmentImagesForTransfer,
  replaceImagesWithPlaceholders,
  restoreImagePlaceholders,
  richTextToPlainText,
  richTextToPlainTextWithImagePlaceholders,
} from "@/lib/editor/rich-text";

describe("richTextToPlainText", () => {
  it("removes html tags and normalizes whitespace", () => {
    expect(richTextToPlainText("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world",
    );
  });

  it("converts non-breaking spaces", () => {
    expect(richTextToPlainText("<p>Hello&nbsp;world</p>")).toBe("Hello world");
  });
});

describe("richTextToPlainTextWithImagePlaceholders", () => {
  it("replaces single image with [Image] placeholder", () => {
    expect(
      richTextToPlainTextWithImagePlaceholders(
        '<p><img src="https://example.com/image.png" alt="test"></p>',
      ),
    ).toBe("[Image]");
  });

  it("replaces multiple images with [Image] placeholders", () => {
    expect(
      richTextToPlainTextWithImagePlaceholders(
        '<p><img src="a.png"><img src="b.png"></p>',
      ),
    ).toBe("[Image] [Image]");
  });

  it("preserves text content alongside image placeholders", () => {
    expect(
      richTextToPlainTextWithImagePlaceholders(
        '<p>Text before <img src="test.png"> text after</p>',
      ),
    ).toBe("Text before [Image] text after");
  });

  it("handles complex mixed content", () => {
    expect(
      richTextToPlainTextWithImagePlaceholders(
        '<p><strong>SMART</strong> objectives:</p><p><img src="smart.png"></p>',
      ),
    ).toBe("SMART objectives: [Image]");
  });

  it("returns empty string for empty content", () => {
    expect(richTextToPlainTextWithImagePlaceholders("<p></p>")).toBe("");
  });

  it("normalizes whitespace around image placeholders", () => {
    expect(
      richTextToPlainTextWithImagePlaceholders(
        '<p>  <img src="a.png">  <img src="b.png">  </p>',
      ),
    ).toBe("[Image] [Image]");
  });
});

describe("hasRichTextContent", () => {
  it("returns false for empty html", () => {
    expect(hasRichTextContent("<p> </p>")).toBe(false);
  });

  it("returns true for text content", () => {
    expect(hasRichTextContent("<p>Card front</p>")).toBe(true);
  });

  it("returns true for image content", () => {
    expect(
      hasRichTextContent('<p><img src="https://img.test/a.png"></p>'),
    ).toBe(true);
  });
});

describe("countInternalAttachmentImages", () => {
  it("counts unique internal attachment image sources", () => {
    expect(
      countInternalAttachmentImages(
        '<p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fa.png"></p><p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fb.png"></p>',
      ),
    ).toBe(2);
  });

  it("counts repeated rendered attachment occurrences", () => {
    expect(
      countInternalAttachmentImages(
        '<p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fa.png"></p><p>/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fa.png</p>',
      ),
    ).toBe(2);
  });

  it("does not count plain-text attachment URL mentions in prose", () => {
    expect(
      countInternalAttachmentImages(
        "<p>Reference this URL later: /api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fa.png</p>",
      ),
    ).toBe(0);
  });

  it("does not count plain anchor links that do not render as images", () => {
    expect(
      countInternalAttachmentImages(
        '<p><a href="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fa.png">download</a></p>',
      ),
    ).toBe(0);
  });
});

describe("getRichTextExcerpt", () => {
  it("returns plain text when below max length", () => {
    expect(getRichTextExcerpt("<p>Card front</p>", 20)).toBe("Card front");
  });

  it("truncates and appends ellipsis", () => {
    expect(getRichTextExcerpt("<p>123456789</p>", 5)).toBe("12345...");
  });
});

describe("normalizeRichTextForRendering", () => {
  it("replaces relative image markup with alt text", async () => {
    const result = await normalizeRichTextForRendering(
      '<p><img src="cisco_switch.jpg" alt="Cisco switch"></p>',
      async () => null,
    );

    expect(result).toBe("<p>Cisco switch</p>");
  });

  it("replaces relative image markup with the source when alt text is missing", async () => {
    const result = await normalizeRichTextForRendering(
      '<p><img src="/foo/bar.png"></p>',
      async () => null,
    );

    expect(result).toBe("<p>/foo/bar.png</p>");
  });

  it("converts image URL paragraphs into image markup", async () => {
    const result = await normalizeRichTextForRendering(
      "<p>https://cdn.example.com/abc123.png</p>",
      async (value) => value,
    );

    expect(result).toBe(
      '<img src="https://cdn.example.com/abc123.png" alt="">',
    );
  });

  it("preserves existing image markup", async () => {
    const result = await normalizeRichTextForRendering(
      '<p><img src="https://img.test/a.png"></p>',
      async () => "https://cdn.example.com/abc123.png",
    );

    expect(result).toBe('<p><img src="https://img.test/a.png"></p>');
  });

  it("replaces unsupported absolute image markup with fallback text", async () => {
    const result = await normalizeRichTextForRendering(
      '<p><img src="https://example.com/gallery/abc123"></p>',
      async () => null,
    );

    expect(result).toBe("<p>https://example.com/gallery/abc123</p>");
  });

  it("keeps unsupported shared links as text", async () => {
    const result = await normalizeRichTextForRendering(
      "<p>https://example.com/gallery/abc123</p>",
      async (value) => value,
    );

    expect(result).toBe("<p>https://example.com/gallery/abc123</p>");
  });

  it("leaves mixed-content paragraphs unchanged", async () => {
    const result = await normalizeRichTextForRendering(
      "<p>See https://example.com/not-an-image later</p>",
      async () => "https://cdn.example.com/abc123.png",
    );

    expect(result).toBe("<p>See https://example.com/not-an-image later</p>");
  });

  it("keeps absolute image markup with non-paragraph content unchanged", async () => {
    const result = await normalizeRichTextForRendering(
      '<img src="https://img.test/a.png" alt="">',
      async () => null,
    );

    expect(result).toBe('<img src="https://img.test/a.png" alt="">');
  });

  it("preserves internal attachment image markup", async () => {
    const result = await normalizeRichTextForRendering(
      '<p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fimage.png" alt=""></p>',
      async () => null,
    );

    expect(result).toBe(
      '<p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fimage.png" alt=""></p>',
    );
  });

  it("converts internal attachment URL paragraphs into image markup", async () => {
    const resolveImageUrl = vi
      .fn<(value: string) => Promise<string | null>>()
      .mockResolvedValue(null);

    const result = await normalizeRichTextForRendering(
      "<p>/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Fimage.png</p>",
      resolveImageUrl,
    );

    expect(result).toBe(
      '<img src="/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Fimage.png" alt="">',
    );
    expect(resolveImageUrl).not.toHaveBeenCalled();
  });
});

describe("normalizeRichTextForUniqueness", () => {
  it("normalizes formatting-only front differences to the same canonical value", () => {
    const first = normalizeRichTextForUniqueness(
      "<p>Hello <strong>World</strong></p>",
    );
    const second = normalizeRichTextForUniqueness("<p>  hello world  </p>");

    expect(first).toBe("hello world");
    expect(second).toBe("hello world");
  });

  it("keeps image URLs in canonical output", () => {
    expect(
      normalizeRichTextForUniqueness(
        '<p><img src="https://img.test/flashcard.png" alt="A"></p>',
      ),
    ).toBe("image:https://img.test/flashcard.png");
  });

  it("treats wrapped image markup with the same URL as duplicates", () => {
    const first = normalizeRichTextForUniqueness(
      '<p><img src="https://img.test/flashcard.png"></p>',
    );
    const second = normalizeRichTextForUniqueness(
      '<div><p><img alt="x" src="https://img.test/flashcard.png"></p></div>',
    );

    expect(first).toBe(second);
  });
});

describe("removeInternalAttachmentImagesForTransfer", () => {
  it("removes internal attachment image markup while preserving text", () => {
    expect(
      removeInternalAttachmentImagesForTransfer(
        '<p>Before <img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fa.png" alt=""> after</p>',
      ),
    ).toBe("<p>Before  after</p>");
  });

  it("removes standalone internal attachment URL paragraphs", () => {
    expect(
      removeInternalAttachmentImagesForTransfer(
        "<p>Keep me</p><p>/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fa.png</p><p>Still here</p>",
      ),
    ).toBe("<p>Keep me</p><p>Still here</p>");
  });

  it("removes anchor-only internal attachment paragraphs", () => {
    expect(
      removeInternalAttachmentImagesForTransfer(
        '<p><a href="/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Fa.png">/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Fa.png</a></p><p>Text</p>',
      ),
    ).toBe("<p>Text</p>");
  });

  it("preserves direct public image URLs and ordinary text", () => {
    expect(
      removeInternalAttachmentImagesForTransfer(
        "<p>https://cdn.example.com/image.png</p><p>Reference /api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fa.png in text</p>",
      ),
    ).toBe(
      "<p>https://cdn.example.com/image.png</p><p>Reference /api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2Fa.png in text</p>",
    );
  });
});

describe("replaceImagesWithPlaceholders", () => {
  it("replaces single image with placeholder", () => {
    const { text, images } = replaceImagesWithPlaceholders(
      '<p>Some text <img src="test.png"> more text</p>',
    );
    expect(text).toBe("<p>Some text {{IMAGE_0}} more text</p>");
    expect(images).toEqual(['<img src="test.png">']);
  });

  it("replaces multiple images with sequential placeholders", () => {
    const { text, images } = replaceImagesWithPlaceholders(
      '<p><img src="a.png"> middle <img src="b.png"> end</p>',
    );
    expect(text).toBe("<p>{{IMAGE_0}} middle {{IMAGE_1}} end</p>");
    expect(images).toEqual(['<img src="a.png">', '<img src="b.png">']);
  });

  it("returns original text when no images", () => {
    const { text, images } = replaceImagesWithPlaceholders("<p>No images</p>");
    expect(text).toBe("<p>No images</p>");
    expect(images).toEqual([]);
  });

  it("handles img tags with different attributes", () => {
    const { text, images } = replaceImagesWithPlaceholders(
      '<p><img src="a.png" alt="test" class="foo"> text</p>',
    );
    expect(text).toBe("<p>{{IMAGE_0}} text</p>");
    expect(images).toEqual(['<img src="a.png" alt="test" class="foo">']);
  });
});

describe("restoreImagePlaceholders", () => {
  it("restores single placeholder to image in paragraph", () => {
    const result = restoreImagePlaceholders("<p>Content {{IMAGE_0}} end</p>", [
      '<img src="test.png">',
    ]);
    expect(result).toBe('<p>Content <img src="test.png"> end</p>');
  });

  it("restores multiple placeholders", () => {
    const result = restoreImagePlaceholders(
      "<p>{{IMAGE_0}} and {{IMAGE_1}}</p>",
      ['<img src="a.png">', '<img src="b.png">'],
    );
    expect(result).toBe('<p><img src="a.png"> and <img src="b.png"></p>');
  });

  it("returns original text when no images", () => {
    const result = restoreImagePlaceholders("<p>No placeholders</p>", []);
    expect(result).toBe("<p>No placeholders</p>");
  });

  it("handles placeholder at start", () => {
    const result = restoreImagePlaceholders("{{IMAGE_0}}<p>after</p>", [
      '<img src="first.png">',
    ]);
    expect(result).toBe('<img src="first.png"><p>after</p>');
  });

  it("appends image at end when placeholder is missing from output", () => {
    const result = restoreImagePlaceholders("<p>AI rewrote everything</p>", [
      '<img src="diagram.png">',
    ]);
    expect(result).toBe('<p>AI rewrote everything</p><img src="diagram.png">');
  });
});
