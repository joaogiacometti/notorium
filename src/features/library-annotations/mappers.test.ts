import { describe, expect, it } from "vitest";
import {
  toAnnotationValues,
  toBookAnnotationDto,
} from "@/features/library-annotations/mappers";

function annotationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "row-1",
    userId: "user-1",
    bookId: "book-1",
    annotationUid: "anno-1",
    pageIndex: 3,
    data: {
      id: "anno-1",
      type: 9,
      pageIndex: 3,
      contents: "a note",
      created: "2026-01-02T03:04:05.000Z",
    },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  } as Parameters<typeof toBookAnnotationDto>[0];
}

describe("toBookAnnotationDto", () => {
  it("maps the row to the reader's import shape", () => {
    const dto = toBookAnnotationDto(annotationRow());
    expect(dto.uid).toBe("anno-1");
    expect(dto.pageIndex).toBe(3);
    expect(dto.annotation.id).toBe("anno-1");
    expect(dto.annotation.contents).toBe("a note");
  });

  it("revives stored ISO date strings to Date instances", () => {
    const dto = toBookAnnotationDto(annotationRow());
    expect(dto.annotation.created).toBeInstanceOf(Date);
    expect((dto.annotation.created as Date).toISOString()).toBe(
      "2026-01-02T03:04:05.000Z",
    );
  });

  it("leaves a missing date field untouched", () => {
    const dto = toBookAnnotationDto(
      annotationRow({ data: { id: "anno-1", type: 9, pageIndex: 3 } }),
    );
    expect(dto.annotation.created).toBeUndefined();
  });
});

describe("toAnnotationValues", () => {
  it("derives the uid and page from the annotation and stores it verbatim", () => {
    const annotation = {
      id: "anno-9",
      type: 9 as const,
      pageIndex: 7,
      rect: { origin: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
      segmentRects: [{ origin: { x: 0, y: 0 }, size: { width: 1, height: 1 } }],
      opacity: 0.4,
    };
    const values = toAnnotationValues("user-1", "book-1", annotation);
    expect(values).toEqual({
      userId: "user-1",
      bookId: "book-1",
      annotationUid: "anno-9",
      pageIndex: 7,
      data: annotation,
    });
  });
});
