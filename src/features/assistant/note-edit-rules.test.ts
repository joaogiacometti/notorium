import { describe, expect, it } from "vitest";
import type {
  NoteDraft,
  NoteEditsInput,
} from "@/features/assistant/document-edit-contract";
import { findNoteEditProblems } from "@/features/assistant/note-edit-rules";

const draft: NoteDraft = {
  kind: "note",
  sessionId: "s",
  revision: 2,
  title: "Cells",
  partial: false,
  blocks: [
    { id: "b0", html: "<h2>Cells</h2>" },
    { id: "b1", html: "<p>The membrane controls what enters the cell.</p>" },
    { id: "b2", html: "<p>$$x^2$$ {{NOTE_IMAGE_b2_0}}</p>" },
  ],
};
const identity = { sessionId: "s", revision: 2 };

function problems(input: Omit<NoteEditsInput, "sessionId" | "revision">) {
  return findNoteEditProblems({ ...identity, ...input }, draft);
}

describe("note edit rules", () => {
  it("accepts a new insertion and a real replacement", () => {
    expect(
      problems({
        insertions: [
          { anchorBlockId: "b1", side: "after", html: "<p>$y$ is new</p>" },
        ],
        replacements: [
          {
            firstBlockId: "b2",
            lastBlockId: "b2",
            html: "<p>$$x^3$$ {{NOTE_IMAGE_b2_0}}</p>",
          },
        ],
      }),
    ).toEqual([]);
  });

  it("names the current draft when the model copies an old identity", () => {
    expect(
      findNoteEditProblems(
        { sessionId: "old", revision: 1, title: "Cell biology" },
        draft,
      ),
    ).toEqual([
      "sessionId old is not the current draft; expected s",
      "revision 1 is not the current draft; expected 2",
    ]);
  });

  it("lists the visible ids when an edit targets an unknown block", () => {
    expect(
      problems({
        replacements: [{ firstBlockId: "b9", lastBlockId: "b1", html: "" }],
      }),
    ).toEqual(["Unknown block id b9; expected one of b0, b1, b2"]);
  });

  it("requires an anchor in a non-empty note and disjoint edits", () => {
    expect(
      problems({ insertions: [{ side: "after", html: "<p>New</p>" }] }),
    ).toEqual([
      "Insertion without anchorBlockId; expected the visible block id to insert beside",
    ]);
    expect(
      problems({
        replacements: [{ firstBlockId: "b0", lastBlockId: "b2", html: "" }],
        insertions: [{ anchorBlockId: "b1", side: "after", html: "<p>N</p>" }],
      }),
    ).toHaveLength(1);
  });

  it("rejects replacements that keep the same content", () => {
    expect(
      problems({
        replacements: [
          {
            firstBlockId: "b1",
            lastBlockId: "b1",
            html: "<p>The membrane controls what enters the cell.</p>\n",
          },
        ],
      }),
    ).toEqual([
      "replacement b1:b1 keeps the current content; expected changed HTML",
    ]);
  });

  it("asks for an insertion when a replacement only adds around kept blocks", () => {
    expect(
      problems({
        replacements: [
          {
            firstBlockId: "b1",
            lastBlockId: "b1",
            html: "<p>The membrane controls what enters the cell.</p><p>$y$</p>",
          },
        ],
      }),
    ).toEqual([
      "replacement b1:b1 keeps its blocks and only adds content after them; expected an insertion after b1 with only the new content",
    ]);
  });

  it("rejects insertions that copy an existing block unless it moves", () => {
    const copy = {
      anchorBlockId: "b2",
      side: "after" as const,
      html: "<p>The membrane controls what enters the cell.</p><p>$z$</p>",
    };
    expect(problems({ insertions: [copy] })).toEqual([
      'insertion after b2 repeats existing text "The membrane controls what enters the ce" of block b1; expected only new content, or replace b1 to move or reword it. Block ids are internal; describe blocks by their content in chat',
    ]);
    expect(
      problems({
        insertions: [copy],
        replacements: [{ firstBlockId: "b1", lastBlockId: "b1", html: "" }],
      }),
    ).toEqual([]);
  });

  it("rejects a reworded copy but not new text sharing a few words", () => {
    const insert = (html: string) =>
      problems({ insertions: [{ anchorBlockId: "b0", side: "after", html }] });
    expect(
      insert("<p>The membrane strictly controls what enters a cell:</p>"),
    ).toHaveLength(1);
    expect(
      insert("<p>The nucleus controls what the cell expresses.</p>"),
    ).toEqual([]);
    expect(insert("<p>$$x^2$$</p>")).toEqual([]);
  });

  it("rejects invented or misplaced images", () => {
    expect(
      problems({
        insertions: [
          {
            anchorBlockId: "b0",
            side: "after",
            html: '<p>{{NOTE_IMAGE_b2_0}}</p><img src="x.png">',
          },
        ],
      }),
    ).toEqual([
      "Image tag or attachment URL in HTML; expected only image placeholders from the draft",
      "Unknown image placeholder {{NOTE_IMAGE_b2_0}}; expected no image placeholder",
    ]);
  });

  it("rejects proposals that change nothing", () => {
    expect(problems({ title: "Cells" })).toEqual([
      "Proposal changes nothing; expected a replacement, insertion, or new title",
    ]);
    expect(problems({ title: "Cell biology" })).toEqual([]);
  });
});
