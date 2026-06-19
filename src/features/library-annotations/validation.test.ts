import { describe, expect, it } from "vitest";
import {
  deleteAnnotationSchema,
  highlightAnnotationSchema,
  saveAnnotationSchema,
} from "@/features/library-annotations/validation";
import { LIMITS } from "@/lib/config/limits";

function validHighlight(overrides: Record<string, unknown> = {}) {
  return {
    id: "anno-1",
    type: 9,
    pageIndex: 0,
    rect: { origin: { x: 0, y: 0 }, size: { width: 10, height: 4 } },
    segmentRects: [{ origin: { x: 0, y: 0 }, size: { width: 10, height: 4 } }],
    opacity: 0.4,
    strokeColor: "#f6d34a",
    contents: "remember this",
    ...overrides,
  };
}

describe("highlightAnnotationSchema", () => {
  it("accepts a well-formed highlight", () => {
    expect(highlightAnnotationSchema.safeParse(validHighlight()).success).toBe(
      true,
    );
  });

  it("keeps unknown forward-compatible fields", () => {
    const parsed = highlightAnnotationSchema.parse(
      validHighlight({ blendMode: 1, futureField: 1 }),
    );
    expect(parsed).toMatchObject({ futureField: 1 });
  });

  it("rejects a non-highlight subtype", () => {
    expect(
      highlightAnnotationSchema.safeParse(validHighlight({ type: 4 })).success,
    ).toBe(false);
  });

  it("rejects an empty segmentRects list", () => {
    expect(
      highlightAnnotationSchema.safeParse(validHighlight({ segmentRects: [] }))
        .success,
    ).toBe(false);
  });

  it("rejects a note longer than the configured limit", () => {
    const contents = "x".repeat(LIMITS.libraryAnnotationNoteMax + 1);
    expect(
      highlightAnnotationSchema.safeParse(validHighlight({ contents })).success,
    ).toBe(false);
  });

  it("rejects a malformed color", () => {
    expect(
      highlightAnnotationSchema.safeParse(
        validHighlight({ strokeColor: "red" }),
      ).success,
    ).toBe(false);
  });
});

describe("saveAnnotationSchema", () => {
  it("requires a bookId alongside the annotation", () => {
    expect(
      saveAnnotationSchema.safeParse({ annotation: validHighlight() }).success,
    ).toBe(false);
    expect(
      saveAnnotationSchema.safeParse({
        bookId: "book-1",
        annotation: validHighlight(),
      }).success,
    ).toBe(true);
  });
});

describe("deleteAnnotationSchema", () => {
  it("requires bookId and annotationUid", () => {
    expect(
      deleteAnnotationSchema.safeParse({
        bookId: "book-1",
        annotationUid: "anno-1",
      }).success,
    ).toBe(true);
    expect(deleteAnnotationSchema.safeParse({ bookId: "book-1" }).success).toBe(
      false,
    );
  });
});
