import { describe, expect, it } from "vitest";
import { locateNoteEdits } from "@/features/assistant/note-edit-ranges";

const ids = ["b0", "b1", "b2"];
const identity = { sessionId: "s", revision: 0 };

describe("locateNoteEdits", () => {
  it("orders edits by position, with an insertion before an adjacent replacement", () => {
    const { edits, problems } = locateNoteEdits(ids, new Set(ids), {
      ...identity,
      replacements: [{ firstBlockId: "b1", lastBlockId: "b2", html: "" }],
      insertions: [{ anchorBlockId: "b0", side: "after", html: "<p>N</p>" }],
    });
    expect(problems).toEqual([]);
    expect(edits.map(({ kind, from, to }) => [kind, from, to])).toEqual([
      ["insertion", 1, 1],
      ["replacement", 1, 3],
    ]);
  });

  it("reports hidden ranges, missing anchors, and overlaps", () => {
    const { problems } = locateNoteEdits(ids, new Set(["b0", "b2"]), {
      ...identity,
      replacements: [{ firstBlockId: "b0", lastBlockId: "b2", html: "" }],
      insertions: [
        { side: "after", html: "<p>N</p>" },
        { anchorBlockId: "b0", side: "after", html: "<p>A</p>" },
        { anchorBlockId: "b2", side: "before", html: "<p>B</p>" },
      ],
    });
    expect(problems).toEqual([
      "Invalid replacement b0:b2; expected contiguous visible blocks, first not after last",
      "Insertion without anchorBlockId; expected the visible block id to insert beside",
    ]);
    expect(
      locateNoteEdits(ids, new Set(ids), {
        ...identity,
        insertions: [
          { anchorBlockId: "b0", side: "after", html: "<p>A</p>" },
          { anchorBlockId: "b1", side: "before", html: "<p>B</p>" },
        ],
      }).problems,
    ).toEqual([
      "insertion before b1 overlaps insertion after b0; expected disjoint edits, combined into one edit where they touch",
    ]);
  });

  it("places an unanchored insertion into an empty note", () => {
    expect(
      locateNoteEdits([], new Set(), {
        ...identity,
        insertions: [{ side: "after", html: "<p>First</p>" }],
      }).edits,
    ).toMatchObject([{ from: 0, to: 0 }]);
  });
});
