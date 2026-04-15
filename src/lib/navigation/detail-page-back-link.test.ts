import { describe, expect, it } from "vitest";
import {
  getAssessmentDetailHref,
  getFlashcardDetailHref,
  getFlashcardsHref,
  getNoteDetailHref,
  getPlanningAssessmentsHref,
  resolveAssessmentDetailBackLink,
  resolveDetailPageReturnContext,
  resolveFlashcardDetailBackLink,
  resolveNoteDetailBackLink,
} from "@/lib/navigation/detail-page-back-link";

describe("resolveDetailPageReturnContext", () => {
  it("returns the parsed context for supported origins", () => {
    expect(
      resolveDetailPageReturnContext({
        from: "flashcards-manage",
        subjectId: "subject-1",
        view: "review",
        deckId: "deck-1",
      }),
    ).toEqual({
      from: "flashcards-manage",
      subjectId: "subject-1",
      view: "review",
      deckId: "deck-1",
    });
  });

  it("drops unsupported origins", () => {
    expect(
      resolveDetailPageReturnContext({
        from: "invalid",
        subjectId: "subject-1",
        view: "invalid",
        deckId: "deck-1",
      }),
    ).toEqual({
      from: undefined,
      subjectId: "subject-1",
      view: undefined,
      deckId: "deck-1",
    });
  });
});

describe("detail href builders", () => {
  it("builds a flashcard detail href with return context", () => {
    expect(
      getFlashcardDetailHref("flashcard-1", {
        from: "flashcards-manage",
        view: "statistics",
        deckId: "deck-1",
      }),
    ).toBe(
      "/flashcards/flashcard-1?from=flashcards-manage&view=statistics&deckId=deck-1",
    );
  });

  it("builds a note detail href with subject context", () => {
    expect(
      getNoteDetailHref("subject-1", "note-1", {
        from: "subject",
      }),
    ).toBe("/subjects/subject-1/notes/note-1?from=subject");
  });

  it("builds an assessment detail href with planning context", () => {
    expect(
      getAssessmentDetailHref("assessment-1", {
        from: "planning-assessments",
        subjectId: "subject-1",
      }),
    ).toBe(
      "/assessments/assessment-1?from=planning-assessments&subjectId=subject-1",
    );
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
        deckId: "deck-1",
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

describe("resolveNoteDetailBackLink", () => {
  it("returns the owning subject", () => {
    expect(resolveNoteDetailBackLink("subject-2")).toEqual({
      href: "/subjects/subject-2",
      label: "subject",
    });
  });
});

describe("resolveAssessmentDetailBackLink", () => {
  it("returns the planning destination when opened from planning", () => {
    expect(
      resolveAssessmentDetailBackLink(
        {
          from: "planning-assessments",
          subjectId: "subject-1",
        },
        "subject-2",
      ),
    ).toEqual({
      href: getPlanningAssessmentsHref("subject-1"),
      label: "planning",
    });
  });

  it("falls back to the owning subject for unsupported context", () => {
    expect(
      resolveAssessmentDetailBackLink(
        {
          from: "invalid",
        },
        "subject-2",
      ),
    ).toEqual({
      href: "/subjects/subject-2",
      label: "subject",
    });
  });
});
