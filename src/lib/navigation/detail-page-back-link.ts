export const detailPageOriginValues = [
  "flashcards-manage",
  "planning-assessments",
] as const;

export type DetailPageOrigin = (typeof detailPageOriginValues)[number];

export type DetailPageBackLabel = "flashcards" | "planning" | "subject";
export type FlashcardsReturnView = "manage" | "review";

export interface DetailPageBackLink {
  href: string;
  label: DetailPageBackLabel;
}

interface DetailPageReturnContextInput {
  from?: string;
  subjectId?: string;
  view?: string;
}

interface DetailPageReturnContext {
  from?: DetailPageOrigin;
  subjectId?: string;
  view?: FlashcardsReturnView;
}

function isDetailPageOrigin(value: string): value is DetailPageOrigin {
  return detailPageOriginValues.includes(value as DetailPageOrigin);
}

function isFlashcardsReturnView(value: string): value is FlashcardsReturnView {
  return ["manage", "review"].includes(value);
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
  subjectId?: string,
  options?: { focus?: boolean },
) {
  return withSearchParams("/flashcards", {
    view,
    subjectId,
    // `focus=1` tells the review view to jump straight into the full-screen
    // focus session instead of landing on the review hub.
    focus: options?.focus ? "1" : undefined,
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
    subjectId: context.subjectId,
  });
}

export function getNoteDetailHref(subjectId: string, noteId: string) {
  return `/subjects/${subjectId}/documents/notes/${noteId}`;
}

export function getMindmapDetailHref(subjectId: string, mindmapId: string) {
  return `/subjects/${subjectId}/documents/mindmaps/${mindmapId}`;
}

export function getBookDetailHref(subjectId: string, bookId: string) {
  return `/subjects/${subjectId}/documents/books/${bookId}`;
}

export function getDocumentDetailHref(item: {
  kind: "note" | "mindmap" | "book";
  subjectId: string;
  id: string;
}) {
  if (item.kind === "note") return getNoteDetailHref(item.subjectId, item.id);
  if (item.kind === "book") return getBookDetailHref(item.subjectId, item.id);
  return getMindmapDetailHref(item.subjectId, item.id);
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
      href: getFlashcardsHref(context.view, context.subjectId),
      label: "flashcards",
    };
  }

  if (context.view || context.subjectId) {
    return {
      href: getFlashcardsHref(context.view ?? "manage", context.subjectId),
      label: "flashcards",
    };
  }

  return {
    href: "/flashcards",
    label: "flashcards",
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
