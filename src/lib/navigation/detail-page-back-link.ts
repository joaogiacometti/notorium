export const detailPageOriginValues = [
  "flashcards-manage",
  "planning-assessments",
  "subject",
] as const;

export type DetailPageOrigin = (typeof detailPageOriginValues)[number];

export type DetailPageBackLabel = "flashcards" | "planning" | "subject";
export type FlashcardsReturnView = "manage" | "review" | "statistics";

export interface DetailPageBackLink {
  href: string;
  label: DetailPageBackLabel;
}

interface DetailPageReturnContextInput {
  from?: string;
  subjectId?: string;
  view?: string;
  deckId?: string;
}

interface DetailPageReturnContext {
  from?: DetailPageOrigin;
  subjectId?: string;
  view?: FlashcardsReturnView;
  deckId?: string;
}

function isDetailPageOrigin(value: string): value is DetailPageOrigin {
  return detailPageOriginValues.includes(value as DetailPageOrigin);
}

function isFlashcardsReturnView(value: string): value is FlashcardsReturnView {
  return ["manage", "review", "statistics"].includes(value);
}

export function resolveDetailPageReturnContext(
  input: DetailPageReturnContextInput,
): DetailPageReturnContext {
  const from =
    input.from && isDetailPageOrigin(input.from) ? input.from : undefined;

  return {
    from,
    subjectId:
      input.subjectId && input.subjectId.length > 0
        ? input.subjectId
        : undefined,
    view:
      input.view && isFlashcardsReturnView(input.view) ? input.view : undefined,
    deckId: input.deckId && input.deckId.length > 0 ? input.deckId : undefined,
  };
}

function withSearchParams(
  pathname: string,
  searchParams: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

export function getFlashcardsHref(
  view: FlashcardsReturnView = "manage",
  deckId?: string,
) {
  return withSearchParams("/flashcards", {
    view,
    deckId,
  });
}

export function getPlanningAssessmentsHref(subjectId?: string) {
  return withSearchParams("/planning", {
    view: "assessments",
    subject: subjectId,
  });
}

export function getFlashcardDetailHref(
  flashcardId: string,
  returnContext?: DetailPageReturnContextInput,
) {
  const context = returnContext
    ? resolveDetailPageReturnContext(returnContext)
    : {};

  return withSearchParams(`/flashcards/${flashcardId}`, {
    from: context.from,
    view: context.view,
    deckId: context.deckId,
  });
}

export function getNoteDetailHref(
  subjectId: string,
  noteId: string,
  returnContext?: DetailPageReturnContextInput,
) {
  const context = returnContext
    ? resolveDetailPageReturnContext(returnContext)
    : {};

  return withSearchParams(`/subjects/${subjectId}/notes/${noteId}`, {
    from: context.from,
    subjectId: context.subjectId,
  });
}

export function getAssessmentDetailHref(
  assessmentId: string,
  returnContext?: DetailPageReturnContextInput,
) {
  const context = returnContext
    ? resolveDetailPageReturnContext(returnContext)
    : {};

  return withSearchParams(`/assessments/${assessmentId}`, {
    from: context.from,
    subjectId: context.subjectId,
  });
}

export function resolveFlashcardDetailBackLink(
  input: DetailPageReturnContextInput,
): DetailPageBackLink {
  const context = resolveDetailPageReturnContext(input);

  if (context.from === "flashcards-manage") {
    return {
      href: getFlashcardsHref(context.view, context.deckId),
      label: "flashcards",
    };
  }

  if (context.view) {
    return {
      href: getFlashcardsHref(context.view, context.deckId),
      label: "flashcards",
    };
  }

  return {
    href: "/flashcards",
    label: "flashcards",
  };
}

export function resolveNoteDetailBackLink(
  subjectId: string,
): DetailPageBackLink {
  return {
    href: `/subjects/${subjectId}`,
    label: "subject",
  };
}

export function resolveAssessmentDetailBackLink(
  input: DetailPageReturnContextInput,
  subjectId: string,
): DetailPageBackLink {
  const context = resolveDetailPageReturnContext(input);

  if (context.from === "planning-assessments") {
    return {
      href: getPlanningAssessmentsHref(context.subjectId),
      label: "planning",
    };
  }

  return {
    href: `/subjects/${subjectId}`,
    label: "subject",
  };
}
