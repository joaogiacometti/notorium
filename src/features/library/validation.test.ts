import { describe, expect, it } from "vitest";
import {
  createBookSchema,
  deleteBookSchema,
  generateTokenSchema,
  updateBookZoomSchema,
  updateReadingPageSchema,
} from "@/features/library/validation";
import { LIMITS } from "@/lib/config/limits";

function validCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "The Pragmatic Programmer",
    author: "Hunt & Thomas",
    subjectId: "subject-1",
    fileName: "pragmatic.pdf",
    mimeType: "application/pdf",
    blobPathname: "notorium/library/user-1/uuid-pragmatic.pdf",
    sizeBytes: 1024,
    ...overrides,
  };
}

describe("createBookSchema", () => {
  it("accepts a valid upload payload and trims the title", () => {
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

  it("rejects a size exceeding the max bytes", () => {
    expect(
      createBookSchema.safeParse(
        validCreateInput({ sizeBytes: LIMITS.libraryBookMaxBytes + 1 }),
      ).success,
    ).toBe(false);
  });

  it("rejects a negative size", () => {
    expect(
      createBookSchema.safeParse(validCreateInput({ sizeBytes: -1 })).success,
    ).toBe(false);
  });

  it("rejects an empty blob pathname", () => {
    expect(
      createBookSchema.safeParse(validCreateInput({ blobPathname: "" }))
        .success,
    ).toBe(false);
  });

  it("rejects a missing subject id", () => {
    expect(
      createBookSchema.safeParse(validCreateInput({ subjectId: "" })).success,
    ).toBe(false);
  });
});

describe("generateTokenSchema", () => {
  it("accepts a valid token request", () => {
    const result = generateTokenSchema.safeParse({
      fileName: "book.pdf",
      mimeType: "application/pdf",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-pdf mime type", () => {
    expect(
      generateTokenSchema.safeParse({
        fileName: "book.pdf",
        mimeType: "image/png",
      }).success,
    ).toBe(false);
  });

  it("rejects an empty file name", () => {
    expect(
      generateTokenSchema.safeParse({
        fileName: "",
        mimeType: "application/pdf",
      }).success,
    ).toBe(false);
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

describe("updateBookZoomSchema", () => {
  it("accepts a fit-mode zoom for a device", () => {
    const result = updateBookZoomSchema.safeParse({
      bookId: "book-1",
      device: "mobile",
      zoom: "fit-width",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a numeric scale within range", () => {
    expect(
      updateBookZoomSchema.safeParse({
        bookId: "book-1",
        device: "desktop",
        zoom: "1.5",
      }).success,
    ).toBe(true);
  });

  it("rejects a numeric scale out of range", () => {
    expect(
      updateBookZoomSchema.safeParse({
        bookId: "book-1",
        device: "desktop",
        zoom: "42",
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown zoom mode", () => {
    expect(
      updateBookZoomSchema.safeParse({
        bookId: "book-1",
        device: "mobile",
        zoom: "fit-everything",
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown device", () => {
    expect(
      updateBookZoomSchema.safeParse({
        bookId: "book-1",
        device: "tablet",
        zoom: "fit-page",
      }).success,
    ).toBe(false);
  });
});

describe("deleteBookSchema", () => {
  it("requires a non-empty book id", () => {
    expect(deleteBookSchema.safeParse({ bookId: "" }).success).toBe(false);
    expect(deleteBookSchema.safeParse({ bookId: "book-1" }).success).toBe(true);
  });
});
