import type {
  FlashcardDraft,
  FlashcardEditField,
  FlashcardEditsInput,
} from "@/features/assistant/edit-contract";
import {
  findDraftIdentityProblems,
  findImageReferenceProblems,
  imagePlaceholdersIn,
  isUnchangedHtml,
} from "@/features/assistant/edit-guards";

const FLASHCARD_EDIT_FIELDS: FlashcardEditField[] = ["front", "back"];

/**
 * Every rule a flashcard draft proposal breaks against the draft the model was
 * shown, phrased as "<problem>; expected <shape>".
 *
 * @example
 * guardEditSchema(flashcardEditsInputSchema, [(input) => findFlashcardEditProblems(input, draft)]);
 */
export function findFlashcardEditProblems(
  input: FlashcardEditsInput,
  draft: FlashcardDraft,
): string[] {
  return [
    ...findDraftIdentityProblems(input, draft),
    ...FLASHCARD_EDIT_FIELDS.flatMap((field) =>
      findFieldProblems(field, input[field], draft[field]),
    ),
  ];
}

function findFieldProblems(
  field: FlashcardEditField,
  proposed: string | undefined,
  current: string,
): string[] {
  if (proposed === undefined) return [];
  if (isUnchangedHtml(proposed, current))
    return [
      `${field} keeps the current content; expected changed HTML, or omit ${field}`,
    ];
  return findImageReferenceProblems(proposed, imagePlaceholdersIn(current)).map(
    (problem) => `${field}: ${problem}`,
  );
}
