import { describe, expect, it } from "vitest";
import {
  createBookSchema,
  deleteBookSchema,
  updateReadingPageSchema,
} from "@/features/library/validation";
import { LIMITS } from "@/lib/config/limits";

function validCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "The Pragmatic Programmer",
    author: "Hunt & Thomas",
    fileName: "pragmatic.pdf",
    mimeType: "application/pdf",
    dataBase64: "aGVsbG8=",
    ...overrides,
  };
}

describe("createBookSchema", () => {
  it("accepts a valid PDF upload and trims the title", () => {
    const result = createBookSchema.safeParse(
      validCreateInput({ title: "  Clean Code  " }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Clean Code");
    }
  });

  it("rejects an empty title", () => {
    expect(
      createBookSchema.safeParse(validCreateInput({ title: "" })).success,
    ).toBe(false);
  });

  it("rejects a title longer than the limit", () => {
    const title = "a".repeat(LIMITS.libraryBookTitleMax + 1);
    expect(
      createBookSchema.safeParse(validCreateInput({ title })).success,
    ).toBe(false);
  });

  it("rejects a non-pdf mime type", () => {
    expect(
      createBookSchema.safeParse(validCreateInput({ mimeType: "image/png" }))
        .success,
    ).toBe(false);
  });

  it("treats author as optional", () => {
    const result = createBookSchema.safeParse(
      validCreateInput({ author: undefined }),
    );
    expect(result.success).toBe(true);
  });
});

describe("updateReadingPageSchema", () => {
  it("accepts a positive integer page", () => {
    const result = updateReadingPageSchema.safeParse({
      bookId: "book-1",
      page: 42,
      totalPages: 380,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a page below 1", () => {
    expect(
      updateReadingPageSchema.safeParse({ bookId: "book-1", page: 0 }).success,
    ).toBe(false);
  });

  it("rejects a non-integer page", () => {
    expect(
      updateReadingPageSchema.safeParse({ bookId: "book-1", page: 1.5 })
        .success,
    ).toBe(false);
  });
});

describe("deleteBookSchema", () => {
  it("requires a non-empty book id", () => {
    expect(deleteBookSchema.safeParse({ bookId: "" }).success).toBe(false);
    expect(deleteBookSchema.safeParse({ bookId: "book-1" }).success).toBe(true);
  });
});
