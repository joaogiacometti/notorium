import type { JSONContent } from "@tiptap/core";
import type { ChatStatus } from "ai";
import type {
  FlashcardDraft,
  NativeFlashcardDraft,
} from "@/features/assistant/edit-contract";
import type { LibraryHit } from "@/features/assistant/library-search-contract";
import type { StudyContext } from "@/features/assistant/study-context";
import type {
  FlashcardExample,
  ProposedFlashcard,
} from "@/features/assistant/tools";
import type {
  AssistantFlashcardProposalPart,
  AssistantLibrarySearchPart,
  AssistantUIMessage,
} from "@/features/assistant/types";
import type { FlashcardSource } from "@/features/flashcards/source-contract";
import type { RichTextDocument } from "@/lib/editor/document";
import { documentToHtml } from "@/lib/editor/document-html";
import {
  getDocumentDetailHref,
  getFlashcardDetailHref,
} from "@/lib/navigation/detail-page-back-link";

interface FolderPathOption {
  id: string;
  path: string;
}

/**
 * Id of the folder whose path matches the one the assistant proposed: exact
 * first, then ignoring case and spaces around "::", since models sometimes
 * re-space or re-case a path. `null` when the path is missing or unknown, so
 * the user picks the folder.
 *
 * @example
 * findProposedFolderId([{ id: "s1", path: "Biology::Cells" }], "biology :: cells"); // "s1"
 */
export function findProposedFolderId(
  folders: FolderPathOption[],
  proposedPath: string | undefined,
): string | null {
  if (!proposedPath) {
    return null;
  }

  const exact = folders.find((folder) => folder.path === proposedPath);
  if (exact) {
    return exact.id;
  }

  const wanted = normalizeFolderPath(proposedPath);
  const loose = folders.find(
    (folder) => normalizeFolderPath(folder.path) === wanted,
  );
  return loose?.id ?? null;
}

function normalizeFolderPath(path: string): string {
  return path
    .split("::")
    .map((segment) => segment.trim().toLowerCase())
    .join("::");
}

/**
 * A code example as a fenced block. The tag keeps only the characters
 * `plainTextToDocument` accepts, so an odd tag such as "c++" cannot leave the
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
  draft: NativeFlashcardDraft,
): FlashcardDraft {
  return {
    ...draft,
    front: draftHtmlForAssistant(draft.front),
    back: draftHtmlForAssistant(draft.back),
  };
}

/** Model-visible editor HTML: image placeholders and math in the `$` format
 * the model writes, so it never copies math elements with misplaced LaTeX.
 * @example draftHtmlForAssistant("<p>Hi</p>"); // "<p>Hi</p>"
 */
export function draftHtmlForAssistant(value: RichTextDocument): string {
  let image = 0;
  function redact(node: JSONContent): JSONContent {
    if (node.type === "image")
      return {
        type: "paragraph",
        content: [{ type: "text", text: `{{IMAGE_${image++}}}` }],
      };
    if (node.type === "inlineMath" || node.type === "blockMath") {
      const delimiter = node.type === "blockMath" ? "$$" : "$";
      const text = {
        type: "text",
        text: `${delimiter}${node.attrs?.latex ?? ""}${delimiter}`,
      };
      return node.type === "blockMath"
        ? { type: "paragraph", content: [text] }
        : text;
    }
    return node.content ? { ...node, content: node.content.map(redact) } : node;
  }
  return documentToHtml({ ...value, content: value.content.map(redact) });
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
 * getLibraryHitHref({ kind: "note", id: "n1", folderId: "s1", ... }); // "/folders/s1/documents/notes/n1"
 */
export function getLibraryHitHref(hit: LibraryHit): string {
  return hit.kind === "flashcard"
    ? getFlashcardDetailHref(hit.id)
    : getDocumentDetailHref({ ...hit, kind: hit.kind });
}

/** Keep proposals tied to the document used for their own request, across navigation.
 * @example readProposalSource(messages, reply.id);
 */
export function readProposalSource(
  messages: AssistantUIMessage[],
  replyId: string,
): FlashcardSource | undefined {
  const replyIndex = messages.findIndex((message) => message.id === replyId);
  if (replyIndex < 0) return undefined;
  return messages
    .slice(0, replyIndex)
    .findLast((message) => message.role === "user")?.metadata?.source;
}

/** The open document a request is about, recorded as its flashcard source.
 * @example readStudyContextSource({ kind: "note", documentId: "n1", ... });
 */
export function readStudyContextSource(
  context: StudyContext | undefined,
): FlashcardSource | undefined {
  // Flashcard sources link back to notes only.
  if (context?.kind !== "note" || !context.documentId) {
    return undefined;
  }
  return { kind: context.kind, id: context.documentId };
}

/** Retry re-sends the last user turn, so it takes the retry's provenance.
 * @example setMessages((m) => stampLastUserMetadata(m, { source }));
 */
export function stampLastUserMetadata(
  messages: AssistantUIMessage[],
  metadata: AssistantUIMessage["metadata"],
): AssistantUIMessage[] {
  const lastUser = messages.findLast((message) => message.role === "user");
  return messages.map((message) =>
    message === lastUser ? { ...message, metadata } : message,
  );
}
