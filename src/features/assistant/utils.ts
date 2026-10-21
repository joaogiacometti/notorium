import type { FlashcardDraft } from "@/features/assistant/edit-contract";
import type {
  FlashcardExample,
  ProposedFlashcard,
} from "@/features/assistant/tools";
import { replaceImagesWithPlaceholders } from "@/lib/editor/rich-text";

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
