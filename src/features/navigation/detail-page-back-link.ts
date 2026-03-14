export const detailPageOriginValues = [
  "flashcards-manage",
  "planning-assessments",
  "subject",
] as const;

export type DetailPageOrigin = (typeof detailPageOriginValues)[number];

export type DetailPageBackLabel = "flashcards" | "planning" | "subject";

export interface DetailPageBackLink {
  href: string;
  label: DetailPageBackLabel;
}

interface DetailPageReturnContextInput {
  from?: string;
  subjectId?: string;
}

interface DetailPageReturnContext {
  from?: DetailPageOrigin;
  subjectId?: string;
}

function isDetailPageOrigin(value: string): value is DetailPageOrigin {
  return detailPageOriginValues.includes(value as DetailPageOrigin);
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

export function getFlashcardsManageHref(subjectId?: string) {
  return withSearchParams("/flashcards", {
    view: "manage",
    subjectId,
  });
}

export function getPlanningAssessmentsHref(subjectId?: string) {
  return withSearchParams("/planning", {
    view: "assessments",
    subject: subjectId,
  });
}

export function getFlashcardDetailHref(
  subjectId: string,
  flashcardId: string,
  returnContext?: DetailPageReturnContextInput,
) {
  const context = returnContext
    ? resolveDetailPageReturnContext(returnContext)
    : {};

  return withSearchParams(`/subjects/${subjectId}/flashcards/${flashcardId}`, {
    from: context.from,
    subjectId: context.subjectId,
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
  subjectId: string,
): DetailPageBackLink {
  const context = resolveDetailPageReturnContext(input);

  if (context.from === "flashcards-manage") {
    return {
      href: getFlashcardsManageHref(context.subjectId),
      label: "flashcards",
    };
  }

  return {
    href: `/subjects/${subjectId}`,
    label: "subject",
  };
}

export function resolveNoteDetailBackLink(
  input: DetailPageReturnContextInput,
  subjectId: string,
): DetailPageBackLink {
  resolveDetailPageReturnContext(input);

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
