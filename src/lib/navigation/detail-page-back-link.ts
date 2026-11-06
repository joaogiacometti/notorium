import {
  DOCUMENT_ROUTE_SEGMENTS,
  type DocumentKind,
} from "@/features/documents/types";

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
  folderId?: string;
  view?: string;
}

interface DetailPageReturnContext {
  from?: DetailPageOrigin;
  folderId?: string;
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
    folderId:
      input.folderId && input.folderId.length > 0 ? input.folderId : undefined,
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
  folderId?: string,
) {
  return withSearchParams("/flashcards", { view, folderId });
}

export function getFlashcardReviewSessionHref(folderId?: string) {
  return withSearchParams("/flashcards/review", { folderId });
}

export function getFlashcardExamSessionHref(folderId?: string) {
  return withSearchParams("/flashcards/exam", { folderId });
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
    folderId: context.folderId,
  });
}

export function getNoteDetailHref(folderId: string, noteId: string) {
  return getDocumentDetailHref({ kind: "note", folderId, id: noteId });
}

export function getDocumentDetailHref(item: {
  kind: DocumentKind;
  folderId: string;
  id: string;
}) {
  return `/folders/${item.folderId}/documents/${DOCUMENT_ROUTE_SEGMENTS[item.kind]}/${item.id}`;
}

export function resolveFlashcardDetailBackLink(
  input: DetailPageReturnContextInput,
): DetailPageBackLink {
  const context = resolveDetailPageReturnContext(input);

  if (context.from === "flashcards-manage") {
    return {
      href: getFlashcardsHref(context.view, context.folderId),
      label: "flashcards",
    };
  }

  if (context.view || context.folderId) {
    return {
      href: getFlashcardsHref(context.view ?? "manage", context.folderId),
      label: "flashcards",
    };
  }

  return {
    href: "/flashcards",
    label: "flashcards",
  };
}
