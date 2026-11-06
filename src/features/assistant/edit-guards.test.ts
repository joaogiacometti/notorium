import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  editToolInputObject,
  findAddedSide,
  findImageReferenceProblems,
  findUnknownIdProblems,
  guardEditSchema,
  hasSameWords,
  isUnchangedMarkdown,
  repeatsMostWords,
} from "@/features/assistant/edit-guards";

describe("edit guards", () => {
  it("reports guard messages as schema issues without changing the JSON Schema", () => {
    const schema = z.object({ label: z.string() }).describe("Edit");
    const guarded = guardEditSchema(schema, [
      (input) =>
        input.label === "same" ? ["Label unchanged; expected new"] : [],
    ]);
    expect(z.toJSONSchema(guarded)).toEqual(z.toJSONSchema(schema));
    expect(guarded.safeParse({ label: "new" }).success).toBe(true);
    expect(
      guarded
        .safeParse({ label: "same" })
        .error?.issues.map((issue) => issue.message),
    ).toEqual(["Label unchanged; expected new"]);
  });

  it("names misplaced fields instead of dropping them", () => {
    const schema = editToolInputObject(
      { title: z.string().optional() },
      ", with each edit inside its list",
    );
    expect(
      schema
        .safeParse({ title: "T", html: "<p>A</p>", side: "after" })
        .error?.issues.map((issue) => issue.message),
    ).toEqual([
      "Unknown field html, side; expected only title, with each edit inside its list",
    ]);
  });

  it("lists valid ids for each unknown reference once", () => {
    expect(findUnknownIdProblems("node", ["a", "x", "x"], ["a", "b"])).toEqual([
      "Unknown node id x; expected one of a, b",
    ]);
    expect(findUnknownIdProblems("edge", ["x"], [])).toEqual([
      "Unknown edge id x; expected no edge reference",
    ]);
  });

  it("compares Markdown ignoring layout whitespace", () => {
    expect(isUnchangedMarkdown("- A\n\n- B\n", "- A\n- B")).toBe(true);
    expect(isUnchangedMarkdown("A.", "A")).toBe(false);
  });

  it("finds Markdown that only adds blocks around unchanged content", () => {
    expect(findAddedSide("A\n\nB", "A")).toBe("after");
    expect(findAddedSide("B\n\nA", "A")).toBe("before");
    expect(findAddedSide("A!", "A")).toBeUndefined();
    expect(findAddedSide("A and more\n\nB", "A")).toBeUndefined();
  });

  it("detects copies by words, reworded or reordered", () => {
    expect(hasSameWords("What is ATP?", "what is atp")).toBe(true);
    expect(hasSameWords("What is ATP?", "What is ADP?")).toBe(false);
    expect(
      repeatsMostWords(
        "the cell membrane controls entry",
        "entry: the cell membrane controls it",
        4,
      ),
    ).toBe(true);
    expect(repeatsMostWords("What is ATP?", "What is ATP?", 4)).toBe(false);
  });

  it("rejects images other than known placeholders", () => {
    expect(
      findImageReferenceProblems("![x](https://example.com/x.png)", []),
    ).toEqual([
      "Image in Markdown; expected only image placeholders from the draft",
    ]);
    expect(
      findImageReferenceProblems('Use `<img src="x">` or `![alt](url)`', []),
    ).toEqual([]);
  });

  it("allows each known image placeholder once", () => {
    expect(findImageReferenceProblems("{{IMAGE_0}}", ["{{IMAGE_0}}"])).toEqual(
      [],
    );
    expect(
      findImageReferenceProblems("{{IMAGE_0}}{{IMAGE_0}}", ["{{IMAGE_0}}"]),
    ).toEqual([
      "Image placeholder {{IMAGE_0}} repeats; expected each image at most once",
    ]);
  });
});
