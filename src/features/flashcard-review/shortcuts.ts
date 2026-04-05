import {
  type ReviewGrade,
  reviewGradeValues,
} from "@/features/flashcards/fsrs";

export type FlashcardReviewShortcutAction =
  | {
      type: "reveal";
    }
  | {
      type: "edit";
    }
  | {
      type: "delete";
    }
  | {
      type: "grade";
      grade: ReviewGrade;
    };

interface GetFlashcardReviewShortcutActionInput {
  key: string;
  revealed: boolean;
  hasCurrentCard: boolean;
  isPending: boolean;
  isDialogOpen: boolean;
  isEditableTarget: boolean;
  hasModifierKey: boolean;
  isRepeat: boolean;
}

const gradeKeyMap: Record<string, ReviewGrade> = Object.fromEntries(
  reviewGradeValues.map((grade, index) => [String(index + 1), grade]),
) as Record<string, ReviewGrade>;

export function getFlashcardReviewShortcutAction({
  key,
  revealed,
  hasCurrentCard,
  isPending,
  isDialogOpen,
  isEditableTarget,
  hasModifierKey,
  isRepeat,
}: GetFlashcardReviewShortcutActionInput): FlashcardReviewShortcutAction | null {
  if (
    !hasCurrentCard ||
    isPending ||
    isDialogOpen ||
    isEditableTarget ||
    hasModifierKey ||
    isRepeat
  ) {
    return null;
  }

  if (key === "Enter" || key === " ") {
    return revealed ? { type: "grade", grade: "good" } : { type: "reveal" };
  }

  if (key === "e") {
    return { type: "edit" };
  }

  if (key === "d") {
    return { type: "delete" };
  }

  if (!revealed) {
    return null;
  }

  const grade = gradeKeyMap[key];

  return grade ? { type: "grade", grade } : null;
}

export function isEditableFlashcardReviewKeyboardTarget(
  target: EventTarget | null,
): boolean {
  let element: Element | null = null;

  if (target instanceof Element) {
    element = target;
  } else if (target instanceof Node) {
    element = target.parentElement;
  }

  if (!element) {
    return false;
  }

  return element.closest("input, textarea, select, [contenteditable]") !== null;
}
