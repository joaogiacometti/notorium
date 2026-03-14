import { describe, expect, it } from "vitest";
import {
  getAssessmentDetailHref,
  getFlashcardDetailHref,
  getFlashcardsManageHref,
  getNoteDetailHref,
  getPlanningAssessmentsHref,
  resolveAssessmentDetailBackLink,
  resolveDetailPageReturnContext,
  resolveFlashcardDetailBackLink,
  resolveNoteDetailBackLink,
} from "@/features/navigation/detail-page-back-link";

describe("resolveDetailPageReturnContext", () => {
  it("returns the parsed context for supported origins", () => {
    expect(
      resolveDetailPageReturnContext({
        from: "flashcards-manage",
        subjectId: "subject-1",
      }),
    ).toEqual({
      from: "flashcards-manage",
      subjectId: "subject-1",
    });
  });

  it("drops unsupported origins", () => {
    expect(
      resolveDetailPageReturnContext({
        from: "invalid",
        subjectId: "subject-1",
      }),
    ).toEqual({
      from: undefined,
      subjectId: "subject-1",
    });
  });
});

describe("detail href builders", () => {
  it("builds a flashcard detail href with return context", () => {
    expect(
      getFlashcardDetailHref("subject-1", "flashcard-1", {
        from: "flashcards-manage",
        subjectId: "subject-1",
      }),
    ).toBe(
      "/subjects/subject-1/flashcards/flashcard-1?from=flashcards-manage&subjectId=subject-1",
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
      resolveFlashcardDetailBackLink(
        {
          from: "flashcards-manage",
          subjectId: "subject-1",
        },
        "subject-2",
      ),
    ).toEqual({
      href: getFlashcardsManageHref("subject-1"),
      label: "flashcards",
    });
  });

  it("falls back to the owning subject when context is missing", () => {
    expect(resolveFlashcardDetailBackLink({}, "subject-2")).toEqual({
      href: "/subjects/subject-2",
      label: "subject",
    });
  });
});

describe("resolveNoteDetailBackLink", () => {
  it("always returns the owning subject", () => {
    expect(
      resolveNoteDetailBackLink(
        {
          from: "subject",
          subjectId: "subject-1",
        },
        "subject-2",
      ),
    ).toEqual({
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
