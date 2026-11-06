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
    { id: "b0", markdown: "## Cells" },
    { id: "b1", markdown: "The membrane controls what enters the cell." },
    { id: "b2", markdown: "$$x^2$$ {{NOTE_IMAGE_b2_0}}" },
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
          { anchorBlockId: "b1", side: "after", markdown: "$y$ is new" },
        ],
        replacements: [
          {
            firstBlockId: "b2",
            lastBlockId: "b2",
            markdown: "$$x^3$$ {{NOTE_IMAGE_b2_0}}",
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
        replacements: [{ firstBlockId: "b9", lastBlockId: "b1", markdown: "" }],
      }),
    ).toEqual(["Unknown block id b9; expected one of b0, b1, b2"]);
  });

  it("requires an anchor in a non-empty note and disjoint edits", () => {
    expect(
      problems({ insertions: [{ side: "after", markdown: "New" }] }),
    ).toEqual([
      "Insertion without anchorBlockId; expected the visible block id to insert beside",
    ]);
    expect(
      problems({
        replacements: [{ firstBlockId: "b0", lastBlockId: "b2", markdown: "" }],
        insertions: [{ anchorBlockId: "b1", side: "after", markdown: "N" }],
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
            markdown: "The membrane controls what enters the cell.\n",
          },
        ],
      }),
    ).toEqual([
      "replacement b1:b1 keeps the current content; expected changed Markdown",
    ]);
  });

  it("asks for an insertion when a replacement only adds around kept blocks", () => {
    expect(
      problems({
        replacements: [
          {
            firstBlockId: "b1",
            lastBlockId: "b1",
            markdown: "The membrane controls what enters the cell.\n\n$y$",
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
      markdown: "The membrane controls what enters the cell.\n\n$z$",
    };
    expect(problems({ insertions: [copy] })).toEqual([
      'insertion after b2 repeats existing text "The membrane controls what enters the ce" of block b1; expected only new content, or replace b1 to move or reword it. Block ids are internal; describe blocks by their content in chat',
    ]);
    expect(
      problems({
        insertions: [copy],
        replacements: [{ firstBlockId: "b1", lastBlockId: "b1", markdown: "" }],
      }),
    ).toEqual([]);
  });

  it("rejects a reworded copy but not new text sharing a few words", () => {
    const insert = (markdown: string) =>
      problems({
        insertions: [{ anchorBlockId: "b0", side: "after", markdown }],
      });
    expect(
      insert("The membrane strictly controls what enters a cell:"),
    ).toHaveLength(1);
    expect(insert("The nucleus controls what the cell expresses.")).toEqual([]);
    expect(insert("$$x^2$$")).toEqual([]);
  });

  it("rejects a shortened copy of a long block", () => {
    const long = {
      ...draft,
      blocks: [
        {
          id: "b0",
          markdown:
            "The notation for the prediction made by the model (the estimated value) is often written as:",
        },
      ],
    };
    expect(
      findNoteEditProblems(
        {
          ...identity,
          insertions: [
            {
              anchorBlockId: "b0",
              side: "before",
              markdown:
                "The notation for the prediction made by the model is written as:\n\n$$y$$",
            },
          ],
        },
        long,
      ),
    ).toHaveLength(1);
  });

  it("rejects invented or misplaced images", () => {
    expect(
      problems({
        insertions: [
          {
            anchorBlockId: "b0",
            side: "after",
            markdown: "{{NOTE_IMAGE_b2_0}}\n\n![](x.png)",
          },
        ],
      }),
    ).toEqual([
      "Image in Markdown; expected only image placeholders from the draft",
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
