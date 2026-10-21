import type { ChatStatus } from "ai";
import type { FlashcardDraft } from "@/features/assistant/edit-contract";
import type { LibraryHit } from "@/features/assistant/library-search-contract";
import type {
  FlashcardExample,
  ProposedFlashcard,
} from "@/features/assistant/tools";
import type {
  AssistantFlashcardProposalPart,
  AssistantLibrarySearchPart,
  AssistantUIMessage,
} from "@/features/assistant/types";
import { replaceImagesWithPlaceholders } from "@/lib/editor/rich-text";
import {
  getDocumentDetailHref,
  getFlashcardDetailHref,
} from "@/lib/navigation/detail-page-back-link";

interface SubjectPathOption {
  id: string;
  path: string;
}

/**
 * Id of the subject whose path matches the one the assistant proposed: exact
 * first, then ignoring case and spaces around "::", since models sometimes
 * re-space or re-case a path. `null` when the path is missing or unknown, so
 * the user picks the subject.
 *
 * @example
 * findProposedSubjectId([{ id: "s1", path: "Biology::Cells" }], "biology :: cells"); // "s1"
 */
export function findProposedSubjectId(
  subjects: SubjectPathOption[],
  proposedPath: string | undefined,
): string | null {
  if (!proposedPath) {
    return null;
  }

  const exact = subjects.find((subject) => subject.path === proposedPath);
  if (exact) {
    return exact.id;
  }

  const wanted = normalizeSubjectPath(proposedPath);
  const loose = subjects.find(
    (subject) => normalizeSubjectPath(subject.path) === wanted,
  );
  return loose?.id ?? null;
}

function normalizeSubjectPath(path: string): string {
  return path
    .split("::")
    .map((segment) => segment.trim().toLowerCase())
    .join("::");
}

/**
 * A code example as a fenced block. The tag keeps only the characters
 * `plainTextToRichText` accepts, so an odd tag such as "c++" cannot leave the
 * fence unrecognized and spill the code into paragraphs.
 *
 * @example
 * formatFlashcardExample({ language: "sql", code: "SELECT 1;" }); // "```sql\nSELECT 1;\n```"
 */
export function formatFlashcardExample(example: FlashcardExample): string {
  const language = example.language.replaceAll(/[^A-Za-z0-9_-]/g, "");
  return `\`\`\`${language}\n${example.code}\n\`\`\``;
}

/**
 * The back saved for a proposed card: the model's answer, then its example
 * block when there is one.
 *
 * @example
 * composeProposedFlashcardBack({ front: "findall/3", back: "- Keeps duplicates" });
 */
export function composeProposedFlashcardBack(card: ProposedFlashcard): string {
  if (!card.example) {
    return card.back;
  }

  return `${card.back}\n\n${formatFlashcardExample(card.example)}`;
}

/** Hide image locations while retaining the draft's rich-text structure.
 * @example prepareDraftForAssistant(draft).front;
 */
export function prepareDraftForAssistant(
  draft: FlashcardDraft,
): FlashcardDraft {
  return {
    ...draft,
    front: replaceImagesWithPlaceholders(draft.front).text,
    back: replaceImagesWithPlaceholders(draft.back).text,
  };
}

/** True while a reply is requested or streaming; sends and tool outputs wait.
 * @example isAssistantReplyInFlight(chat.status);
 */
export function isAssistantReplyInFlight(status: ChatStatus): boolean {
  return status === "submitted" || status === "streaming";
}

/** The `proposeFlashcards` calls in one chat message, in order.
 * @example readFlashcardProposalParts(message).length;
 */
export function readFlashcardProposalParts(
  message: AssistantUIMessage,
): AssistantFlashcardProposalPart[] {
  return message.parts.filter(
    (part): part is AssistantFlashcardProposalPart =>
      part.type === "tool-proposeFlashcards",
  );
}

/** The `searchLibrary` calls in one chat message, in order.
 * @example readLibrarySearchParts(message).length;
 */
export function readLibrarySearchParts(
  message: AssistantUIMessage,
): AssistantLibrarySearchPart[] {
  return message.parts.filter(
    (part): part is AssistantLibrarySearchPart =>
      part.type === "tool-searchLibrary",
  );
}

/**
 * Detail page of a library search hit, built from its ids rather than a URL
 * the model or client could have written.
 *
 * @example
 * getLibraryHitHref({ kind: "note", id: "n1", subjectId: "s1", ... }); // "/subjects/s1/documents/notes/n1"
 */
export function getLibraryHitHref(hit: LibraryHit): string {
  return hit.kind === "flashcard"
    ? getFlashcardDetailHref(hit.id)
    : getDocumentDetailHref({ ...hit, kind: hit.kind });
}
