import { describe, expect, it } from "vitest";
import {
  getDocumentDetailHref,
  getFlashcardDetailHref,
  getFlashcardExamSessionHref,
  getFlashcardReviewSessionHref,
  getFlashcardsHref,
  getNoteDetailHref,
  isFlashcardSessionPath,
  resolveDetailPageReturnContext,
  resolveFlashcardDetailBackLink,
} from "@/lib/navigation/detail-page-back-link";

describe("resolveDetailPageReturnContext", () => {
  it("returns the parsed context for supported origins", () => {
    expect(
      resolveDetailPageReturnContext({
        from: "flashcards-manage",
        folderId: "folder-1",
        view: "review",
      }),
    ).toEqual({
      from: "flashcards-manage",
      folderId: "folder-1",
      view: "review",
    });
  });

  it("drops unsupported origins", () => {
    expect(
      resolveDetailPageReturnContext({
        from: "invalid",
        folderId: "folder-1",
        view: "invalid",
      }),
    ).toEqual({
      from: undefined,
      folderId: "folder-1",
      view: undefined,
    });
  });
});

describe("detail href builders", () => {
  it("builds a flashcard detail href with return context", () => {
    expect(
      getFlashcardDetailHref("flashcard-1", {
        from: "flashcards-manage",
        view: "manage",
        folderId: "deck-1",
      }),
    ).toBe(
      "/flashcards/flashcard-1?from=flashcards-manage&view=manage&folderId=deck-1",
    );
  });

  it("builds a note detail href with folder context", () => {
    expect(getNoteDetailHref("folder-1", "note-1")).toBe(
      "/folders/folder-1/documents/notes/note-1",
    );
  });

  it("routes each document kind to its detail page", () => {
    expect(
      getDocumentDetailHref({ kind: "note", folderId: "s1", id: "n1" }),
    ).toBe("/folders/s1/documents/notes/n1");
    expect(
      getDocumentDetailHref({ kind: "pdf", folderId: "s1", id: "p1" }),
    ).toBe("/folders/s1/documents/pdfs/p1");
  });
});

describe("resolveFlashcardDetailBackLink", () => {
  it("returns the flashcards manager destination when opened from manage", () => {
    expect(
      resolveFlashcardDetailBackLink({ from: "flashcards-manage" }),
    ).toEqual({
      href: getFlashcardsHref(),
      label: "flashcards",
    });
  });

  it("returns the scoped flashcards destination when view context is present", () => {
    expect(
      resolveFlashcardDetailBackLink({
        from: "flashcards-manage",
        view: "review",
        folderId: "deck-1",
      }),
    ).toEqual({
      href: getFlashcardsHref("review", "deck-1"),
      label: "flashcards",
    });
  });

  it("falls back to /flashcards when context is missing", () => {
    expect(resolveFlashcardDetailBackLink({})).toEqual({
      href: "/flashcards",
      label: "flashcards",
    });
  });
});

describe("flashcard session hrefs", () => {
  it("links the review session with an optional folder scope", () => {
    expect(getFlashcardReviewSessionHref()).toBe("/flashcards/review");
    expect(getFlashcardReviewSessionHref("deck-1")).toBe(
      "/flashcards/review?folderId=deck-1",
    );
  });

  it("links the exam session with an optional folder scope", () => {
    expect(getFlashcardExamSessionHref()).toBe("/flashcards/exam");
    expect(getFlashcardExamSessionHref("deck-1")).toBe(
      "/flashcards/exam?folderId=deck-1",
    );
  });

  it("recognizes only the session routes", () => {
    expect(isFlashcardSessionPath("/flashcards/review")).toBe(true);
    expect(isFlashcardSessionPath("/flashcards/exam")).toBe(true);
    expect(isFlashcardSessionPath("/flashcards")).toBe(false);
    expect(isFlashcardSessionPath("/flashcards/card-1")).toBe(false);
    expect(isFlashcardSessionPath(null)).toBe(false);
  });
});
