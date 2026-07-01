"use client";

import { useEffect, useEffectEvent } from "react";
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
      type: "reset";
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

interface UseFlashcardReviewShortcutsOptions {
  shortcutsEnabled: boolean;
  shortcutsSuspended: boolean;
  isFocusMode: boolean;
  isExamMode: boolean;
  revealed: boolean;
  hasCurrentCard: boolean;
  isPending: boolean;
  isDialogOpen: boolean;
  onReveal: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReset: () => void;
  onGrade: (grade: ReviewGrade) => void;
  onExitExamMode: () => void;
  onExitFocusMode: () => void;
}

const gradeKeyMap: Record<string, ReviewGrade> = Object.fromEntries(
  reviewGradeValues.map((grade, index) => [String(index + 1), grade]),
) as Record<string, ReviewGrade>;

/**
 * Wires flashcard review keyboard shortcuts for the focus/exam view.
 *
 * @example
 * useFlashcardReviewShortcuts({ shortcutsEnabled, shortcutsSuspended, isFocusMode, isExamMode, revealed, hasCurrentCard, isPending, isDialogOpen, onReveal, onEdit, onDelete, onReset, onGrade, onExitExamMode, onExitFocusMode });
 */
export function useFlashcardReviewShortcuts(
  options: UseFlashcardReviewShortcutsOptions,
) {
  const handleReviewKeyDown = useEffectEvent((event: KeyboardEvent) => {
    handleFlashcardReviewKeyDown(event, options);
  });

  useEffect(() => {
    document.addEventListener("keydown", handleReviewKeyDown);
    return () => document.removeEventListener("keydown", handleReviewKeyDown);
  }, []);
}

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

  if (key.toLowerCase() === "r") {
    return { type: "reset" };
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

function handleFlashcardReviewKeyDown(
  event: KeyboardEvent,
  options: UseFlashcardReviewShortcutsOptions,
) {
  if (!options.shortcutsEnabled) return;
  if (options.shortcutsSuspended) return;
  if (handleReviewEscape(event, options)) return;
  if (!options.isFocusMode) return;
  const action = getFlashcardReviewShortcutAction({
    key: event.key,
    revealed: options.revealed,
    hasCurrentCard: options.hasCurrentCard,
    isPending: options.isPending,
    isDialogOpen: options.isDialogOpen,
    isEditableTarget: isEditableFlashcardReviewKeyboardTarget(event.target),
    hasModifierKey: event.altKey || event.ctrlKey || event.metaKey,
    isRepeat: event.repeat,
  });
  if (!action) return;
  event.preventDefault();
  runFlashcardReviewShortcutAction(action, options);
}

function handleReviewEscape(
  event: KeyboardEvent,
  options: UseFlashcardReviewShortcutsOptions,
): boolean {
  if (!options.isFocusMode || event.key !== "Escape") return false;
  if (options.isDialogOpen) return true;
  event.preventDefault();
  if (options.isExamMode) options.onExitExamMode();
  else options.onExitFocusMode();
  return true;
}

function runFlashcardReviewShortcutAction(
  action: FlashcardReviewShortcutAction,
  options: UseFlashcardReviewShortcutsOptions,
) {
  if (action.type === "reveal") options.onReveal();
  else if (action.type === "edit") options.onEdit();
  else if (action.type === "delete") options.onDelete();
  else if (action.type === "reset") options.onReset();
  else options.onGrade(action.grade);
}
