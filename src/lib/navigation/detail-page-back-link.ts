export const detailPageOriginValues = ["flashcards-manage"] as const;

export type DetailPageOrigin = (typeof detailPageOriginValues)[number];

export type DetailPageBackLabel = "flashcards";
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
) {
  return withSearchParams("/flashcards", { view, subjectId });
}

export function getFlashcardReviewSessionHref(subjectId?: string) {
  return withSearchParams("/flashcards/review", { subjectId });
}

export function getFlashcardExamSessionHref(subjectId?: string) {
  return withSearchParams("/flashcards/exam", { subjectId });
}

const flashcardSessionPaths = ["/flashcards/review", "/flashcards/exam"];

/** True for the distraction-free review and exam session routes. */
export function isFlashcardSessionPath(pathname: string | null) {
  return pathname !== null && flashcardSessionPaths.includes(pathname);
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

export function getDocumentDetailHref(item: {
  kind: "note" | "mindmap";
  subjectId: string;
  id: string;
}) {
  if (item.kind === "note") return getNoteDetailHref(item.subjectId, item.id);
  return getMindmapDetailHref(item.subjectId, item.id);
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
