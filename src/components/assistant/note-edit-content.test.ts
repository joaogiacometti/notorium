// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  buildNoteDraft,
  prepareNoteEdits,
  splitNoteBlocks,
} from "@/components/assistant/note-edit-content";
import type { NoteEditsInput } from "@/features/assistant/document-edit-contract";

const content = "<h2>Cells</h2><p>Original explanation</p><p>Keep this</p>";
const identity = { sessionId: "s", revision: 0 };
type NoteReplacement = NonNullable<NoteEditsInput["replacements"]>[number];
type NoteInsertion = NonNullable<NoteEditsInput["insertions"]>[number];
function proposal(
  replacements: NoteReplacement[],
  insertions: NoteInsertion[] = [],
): NoteEditsInput {
  return { ...identity, replacements, insertions };
}

describe("targeted note edits", () => {
  it("assigns ephemeral block ids and preserves unrelated blocks", () => {
    expect(splitNoteBlocks(content).map((block) => block.id)).toEqual([
      "b0",
      "b1",
      "b2",
    ]);
    const draft = buildNoteDraft("s", 0, "Cells", content);
    const result = prepareNoteEdits(
      draft,
      content,
      proposal([
        {
          firstBlockId: "b1",
          lastBlockId: "b1",
          html: "<p>Clear explanation</p>",
        },
      ]),
    );
    expect(result.content).toBe(
      "<h2>Cells</h2><p>Clear explanation</p><p>Keep this</p>",
    );
    expect(content).toContain("Original explanation");
  });
  it("shows math to the model as delimited LaTeX and restores edited math nodes", () => {
    const mathContent =
      '<p>Weight <span data-type="inline-math" data-latex="w_1"></span></p><div data-type="block-math" data-latex="y = ax + b"></div>';
    const draft = buildNoteDraft("s", 0, "Regression", mathContent);
    expect(draft.blocks.map((block) => block.html)).toEqual([
      "<p>Weight $w_1$</p>",
      "<p>$$y = ax + b$$</p>",
    ]);
    const result = prepareNoteEdits(
      draft,
      mathContent,
      proposal([
        {
          firstBlockId: "b0",
          lastBlockId: "b1",
          html: "<p><strong>Weight</strong> $w_1$</p><p>$$\\hat{y} = ax + b$$</p>",
        },
      ]),
    );
    expect(result.content).toBe(
      '<p><strong>Weight</strong> <span data-latex="w_1" data-type="inline-math"></span></p><div data-latex="\\hat{y} = ax + b" data-type="block-math"></div>',
    );
  });
  it("supports insertion, deletion, and title changes together", () => {
    const draft = buildNoteDraft("s", 0, "Cells", content);
    const result = prepareNoteEdits(draft, content, {
      ...proposal(
        [{ firstBlockId: "b1", lastBlockId: "b1", html: "" }],
        [{ anchorBlockId: "b2", side: "after", html: "<p>Added</p>" }],
      ),
      title: "Cell biology",
    });
    expect(result).toMatchObject({
      title: "Cell biology",
      content: "<h2>Cells</h2><p>Keep this</p><p>Added</p>",
    });
  });
  it("inserts into an empty document", () => {
    expect(
      prepareNoteEdits(
        buildNoteDraft("s", 0, "Empty", ""),
        "",
        proposal([], [{ side: "after", html: "First" }]),
      ).content,
    ).toBe("<p>First</p>");
  });
  it("applies an insertion just before an adjacent replaced block", () => {
    const draft = buildNoteDraft("s", 0, "Cells", content);
    const result = prepareNoteEdits(
      draft,
      content,
      proposal(
        [{ firstBlockId: "b1", lastBlockId: "b1", html: "" }],
        [{ anchorBlockId: "b0", side: "after", html: "<p>Moved</p>" }],
      ),
    );
    expect(result.content).toBe("<h2>Cells</h2><p>Moved</p><p>Keep this</p>");
    expect(result.segments.map((segment) => segment.replacement)).toEqual([
      "<p>Moved</p>",
      "",
    ]);
  });
  it("rejects an unanchored insertion into a non-empty note", () => {
    const draft = buildNoteDraft("s", 0, "Cells", content);
    expect(() =>
      prepareNoteEdits(
        draft,
        content,
        proposal([], [{ side: "after", html: "<p>Last</p>" }]),
      ),
    ).toThrow("anchorBlockId");
  });
  it("rejects ambiguous insertions at the same position", () => {
    const draft = buildNoteDraft("s", 0, "Cells", content);
    expect(() =>
      prepareNoteEdits(
        draft,
        content,
        proposal(
          [],
          [
            { anchorBlockId: "b0", side: "after", html: "<p>One</p>" },
            { anchorBlockId: "b1", side: "before", html: "<p>Two</p>" },
          ],
        ),
      ),
    ).toThrow("overlaps");
  });
  it("rejects overlap and unseen blocks", () => {
    const draft = buildNoteDraft("s", 0, "Cells", content);
    const replace = {
      firstBlockId: "b0",
      lastBlockId: "b1",
      html: "<p>Changed</p>",
    };
    expect(() =>
      prepareNoteEdits(
        draft,
        content,
        proposal([replace, { ...replace, firstBlockId: "b1" }]),
      ),
    ).toThrow("overlaps");
    expect(() =>
      prepareNoteEdits(
        { ...draft, blocks: draft.blocks.filter((block) => block.id !== "b1") },
        content,
        proposal([replace]),
      ),
    ).toThrow("visible");
  });
  it("prioritizes selected complete blocks and never edits omitted content", () => {
    const large = `<p>${"x".repeat(12500)}</p><p>Target</p><p>Untouched</p>`;
    const draft = buildNoteDraft("s", 0, "Large", large, [1]);
    expect(draft.partial).toBe(true);
    expect(draft.blocks.map((block) => block.id)).toEqual(["b1", "b2"]);
    const result = prepareNoteEdits(
      draft,
      large,
      proposal([
        {
          firstBlockId: "b1",
          lastBlockId: "b1",
          html: "Improved",
        },
      ]),
    );
    expect(result.content).toContain("x".repeat(12500));
    expect(result.content).toContain("<p>Improved</p><p>Untouched</p>");
  });
  it("restores each original image once across multiple blocks", () => {
    const images =
      '<p>One<img src="/api/attachments/blob?pathname=one"></p><p>Two<img src="/api/attachments/blob?pathname=two"></p>';
    const draft = buildNoteDraft("s", 0, "Images", images);
    expect(JSON.stringify(draft)).not.toContain("pathname");
    const result = prepareNoteEdits(
      draft,
      images,
      proposal([
        {
          firstBlockId: "b0",
          lastBlockId: "b1",
          html: "<p>Combined {{NOTE_IMAGE_b0_0}} {{NOTE_IMAGE_b1_0}}</p>",
        },
      ]),
    );
    expect(result.content.match(/<img/g)).toHaveLength(2);
    expect(result.content).toContain("pathname=one");
    expect(result.content).toContain("pathname=two");
  });
  it("rejects invented images and sanitizes script content", () => {
    const draft = buildNoteDraft("s", 0, "Cells", content);
    const replace = {
      firstBlockId: "b1",
      lastBlockId: "b1",
      html: '<img src="https://example.com/invented.png">',
    };
    expect(() => prepareNoteEdits(draft, content, proposal([replace]))).toThrow(
      "attachment",
    );
    expect(
      prepareNoteEdits(
        draft,
        content,
        proposal([
          {
            ...replace,
            html: '<p onclick="bad()">Safe</p><script>bad()</script>',
          },
        ]),
      ).content,
    ).toContain("<p>Safe</p>");
    expect(
      prepareNoteEdits(
        draft,
        content,
        proposal([
          {
            ...replace,
            html: '<p onclick="bad()">Safe</p><script>bad()</script>',
          },
        ]),
      ).content,
    ).not.toMatch(/script|onclick/);
  });
});
