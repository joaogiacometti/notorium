// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { documentToNode as parseDocument } from "@/lib/editor/document";
import { buildDocumentExtensions } from "@/lib/editor/document-extensions";
import {
  buildDocumentReviewDecorations,
  buildReviewDecorations,
  buildRichTextReviewExtension,
} from "@/lib/editor/rich-text-review-decorations";

import { testDocument } from "@/test/document";

const parseReviewedRichText = (html: string) =>
  parseDocument(testDocument(html));

const IMAGE = '<img src="/api/attachments/a">';

/** Text of every added range, read back from the proposed document. */
function addedRanges(before: string, after: string) {
  const proposed = parseReviewedRichText(after);
  return buildReviewDecorations(parseReviewedRichText(before), proposed)
    .find()
    .filter((decoration) => decoration.from !== decoration.to)
    .map((decoration) =>
      proposed.textBetween(decoration.from, decoration.to, "|", "#"),
    );
}

/** Render the review and report what a reader sees as removed. */
function renderReview(before: string, after: string) {
  const editor = new Editor({
    extensions: [
      ...buildDocumentExtensions(),
      buildRichTextReviewExtension(parseReviewedRichText(before)),
    ],
    content: after,
    editable: false,
  });
  const removed = [
    ...editor.view.dom.querySelectorAll('[aria-label="Removed content"]'),
  ];
  const result = {
    removed: removed.map((element) => element.textContent),
    removedBlocks: removed.flatMap((element) => [
      ...element.querySelectorAll("p"),
    ]),
    images: editor.view.dom.querySelectorAll("img").length,
  };
  editor.destroy();
  return result;
}

describe("rich text review decorations", () => {
  it("leaves unchanged documents undecorated", () => {
    const document = parseReviewedRichText("<p>Same</p>");
    expect(buildReviewDecorations(document, document).find()).toHaveLength(0);
  });

  it("decorates replacement text while leaving serialized content clean", () => {
    const original = parseReviewedRichText("<p>The long answer.</p>");
    const editor = new Editor({
      extensions: [
        ...buildDocumentExtensions(),
        buildRichTextReviewExtension(original),
      ],
      content: "<p>The short answer.</p>",
      editable: false,
    });
    expect(editor.view.dom.textContent).toContain("long");
    expect(editor.view.dom.textContent).toContain("short");
    expect(editor.getHTML()).toBe("<p>The short answer.</p>");
    editor.destroy();
  });

  it.each([
    ["<p>Old</p><p>Removed</p>", "<p>New</p>"],
    ["<p></p>", "<ul><li><p>Added</p></li></ul>"],
    [
      '<p><span data-type="inline-math" data-latex="x"></span></p>',
      '<p><span data-type="inline-math" data-latex="y"></span></p>',
    ],
    ["<p><strong>Same</strong></p>", "<p>Same</p>"],
  ])(
    "handles structural changes without corrupting the document",
    (before, after) => {
      const editor = new Editor({
        extensions: [
          ...buildDocumentExtensions(),
          buildRichTextReviewExtension(parseReviewedRichText(before)),
        ],
        content: after,
        editable: false,
      });
      expect(editor.getJSON()).toEqual(parseReviewedRichText(after).toJSON());
      editor.destroy();
    },
  );

  it("does not flag unchanged content between separate changes", () => {
    const before = `<ul><li><p>Old first</p></li><li><p>Same second</p></li></ul>${IMAGE}<p>Tail</p>`;
    const after = `<ul><li><p>New first</p></li><li><p>Same second</p></li></ul>${IMAGE}<p>Tail!</p>`;
    const added = addedRanges(before, after);
    expect(added.join(" ")).not.toContain("Same second");
    expect(added).not.toContain("#");
    expect(added).toEqual(expect.arrayContaining(["New", "!"]));
    const rendered = renderReview(before, after);
    expect(rendered.removed).toEqual(["Old"]);
    expect(rendered.images).toBe(1);
  });

  it("reports separate word changes as separate ranges", () => {
    expect(
      addedRanges(
        "<p>The quick brown fox jumps over the lazy dog</p>",
        "<p>The quick red fox leaps over the lazy cat</p>",
      ),
    ).toEqual(["red", "leaps", "cat"]);
  });

  it.each([
    ["bold only", "<p>Same</p>", "<p><strong>Same</strong></p>"],
    [
      "image source",
      `${IMAGE}<p>x</p>`,
      '<img src="/api/attachments/b"><p>x</p>',
    ],
    [
      "inline math",
      '<p><span data-type="inline-math" data-latex="x"></span></p>',
      '<p><span data-type="inline-math" data-latex="y"></span></p>',
    ],
    ["heading level", "<h1>Title</h1><p>x</p>", "<h2>Title</h2><p>x</p>"],
    ["wrapping in a list", "<p>item</p>", "<ul><li><p>item</p></li></ul>"],
    ["unwrapping a list", "<ul><li><p>item</p></li></ul>", "<p>item</p>"],
  ])("still flags a formatting change: %s", (_name, before, after) => {
    expect(addedRanges(before, after).length).toBeGreaterThan(0);
  });

  it("flags only a heading level change's block", () => {
    expect(
      addedRanges("<h1>Title</h1><p>x</p>", "<h2>Title</h2><p>x</p>"),
    ).toEqual(["Title"]);
  });

  it("shows a deleted paragraph without an empty block", () => {
    const rendered = renderReview(
      "<p>one</p><p>gone</p><p>two</p>",
      "<p>one</p><p>two</p>",
    );
    expect(rendered.removed).toEqual(["gone"]);
    expect(
      rendered.removedBlocks.filter((block) => !block.textContent),
    ).toEqual([]);
  });

  it("keeps segment offsets across unchanged blocks", () => {
    const proposed = parseReviewedRichText(
      "<p>New one</p><p>Same</p><p>Other two</p>",
    );
    const firstOffset = 0;
    const secondOffset = parseReviewedRichText("<p>New one</p><p>Same</p>")
      .content.size;
    const decorations = buildDocumentReviewDecorations(
      [
        {
          original: testDocument("<p>Old one</p>"),
          replacement: testDocument("<p>New one</p>"),
          offset: firstOffset,
        },
        {
          original: testDocument("<p>Old two</p>"),
          replacement: testDocument("<p>Other two</p>"),
          offset: secondOffset,
        },
      ],
      proposed,
    );
    expect(
      decorations
        .find()
        .filter((decoration) => decoration.from !== decoration.to)
        .map((decoration) =>
          proposed.textBetween(decoration.from, decoration.to),
        ),
    ).toEqual(["New", "Other"]);
  });

  it("keeps a rewritten block whole instead of scattering fragments", () => {
    const before =
      "<p>Mathematics is the study of numbers, quantities, and shapes using logical reasoning</p>";
    const rendered = renderReview(
      before,
      "<ul><li><p>Numbers, quantities, shapes</p></li><li><p>Method: logical reasoning</p></li></ul>",
    );
    expect(rendered.removed).toEqual([
      "Mathematics is the study of numbers, quantities, and shapes using logical reasoning",
    ]);
  });

  it("shows a reordered list item whole on both sides", () => {
    const other = "Other roles include calcium buffering";
    const own = "Own DNA is circular here";
    const before = `<ul><li><p>${other}</p></li><li><p>${own}</p></li></ul>`;
    const after = `<ul><li><p>${own}</p></li><li><p>${other}</p></li></ul>`;
    const [removed, ...rest] = renderReview(before, after).removed;
    expect(rest).toEqual([]);
    expect([other, own]).toContain(removed);
    expect(addedRanges(before, after)).toContain(removed);
  });

  it("marks a rewritten list item without touching its neighbours", () => {
    const same = "One root and every other node has one parent";
    const added = addedRanges(
      `<ul><li><p>${same}</p></li><li><p>Completely different original words</p></li></ul>`,
      `<ul><li><p>${same}</p></li><li><p>Replacement sentence about graphs</p></li></ul>`,
    );
    expect(added.join(" ")).not.toContain(same);
    expect(added).toContain("Replacement sentence about graphs");
  });

  it("flags whole words rather than parts of them", () => {
    const before = "<p>What does math study in the end</p>";
    const after = "<p>What does mathematics study in the end</p>";
    expect(addedRanges(before, after)).toEqual(["mathematics"]);
    expect(renderReview(before, after).removed).toEqual(["math"]);
  });
});
