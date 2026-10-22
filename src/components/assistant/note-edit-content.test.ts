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
    ).toThrow("Overlapping");
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
