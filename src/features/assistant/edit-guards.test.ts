import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  editToolInputObject,
  findAddedSide,
  findImageReferenceProblems,
  findUnknownIdProblems,
  guardEditSchema,
  isUnchangedHtml,
  visibleHtmlText,
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

  it("compares HTML and text ignoring layout whitespace", () => {
    expect(isUnchangedHtml("<p>A</p>\n<p>B</p>", "<p>A</p><p>B</p>")).toBe(
      true,
    );
    expect(isUnchangedHtml("<p>A.</p>", "<p>A</p>")).toBe(false);
    expect(visibleHtmlText("<p>A <b>b</b></p>\n<p>c</p>")).toBe("A b c");
  });

  it("finds HTML that only adds blocks around unchanged content", () => {
    expect(findAddedSide("<p>A</p>\n<p>B</p>", "<p>A</p>")).toBe("after");
    expect(findAddedSide("<p>B</p><p>A</p>", "<p>A</p>")).toBe("before");
    expect(findAddedSide("<p>A!</p>", "<p>A</p>")).toBeUndefined();
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
