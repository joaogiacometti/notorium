"use client";

import { useEffect, useEffectEvent } from "react";
import {
  type ReviewGrade,
  reviewGradeValues,
} from "@/features/flashcards/fsrs";
import { isEditableTarget } from "@/lib/shortcuts/registry";

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
      type: "undo";
    }
  | {
      type: "grade";
      grade: ReviewGrade;
    };

interface GetFlashcardReviewShortcutActionInput {
  key: string;
  revealed: boolean;
  hasCurrentCard: boolean;
  canUndoReview: boolean;
  isPending: boolean;
  isDialogOpen: boolean;
  isEditableTarget: boolean;
  hasModifierKey: boolean;
  isRepeat: boolean;
}

interface UseFlashcardReviewShortcutsOptions {
  shortcutsSuspended: boolean;
  revealed: boolean;
  hasCurrentCard: boolean;
  canUndoReview: boolean;
  isPending: boolean;
  isDialogOpen: boolean;
  onReveal: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReset: () => void;
  onUndo: () => void;
  onGrade: (grade: ReviewGrade) => void;
  onExit: () => void;
}

const gradeKeyMap: Record<string, ReviewGrade> = Object.fromEntries(
  reviewGradeValues.map((grade, index) => [String(index + 1), grade]),
) as Record<string, ReviewGrade>;

/**
 * Wires flashcard review keyboard shortcuts for the review and exam session pages.
 *
 * @example
 * useFlashcardReviewShortcuts({ shortcutsSuspended, revealed, hasCurrentCard, canUndoReview, isPending, isDialogOpen, onReveal, onEdit, onDelete, onReset, onUndo, onGrade, onExit });
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
  canUndoReview,
  isPending,
  isDialogOpen,
  isEditableTarget,
  hasModifierKey,
  isRepeat,
}: GetFlashcardReviewShortcutActionInput): FlashcardReviewShortcutAction | null {
  if (isPending || isDialogOpen || isEditableTarget || hasModifierKey) {
    return null;
  }

  if (isRepeat) {
    return null;
  }

  // Undo stays available after the last card is graded, when no card is shown.
  if (key.toLowerCase() === "u") {
    return canUndoReview ? { type: "undo" } : null;
  }

  if (!hasCurrentCard) {
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

function handleFlashcardReviewKeyDown(
  event: KeyboardEvent,
  options: UseFlashcardReviewShortcutsOptions,
) {
  if (options.shortcutsSuspended) return;
  if (handleReviewEscape(event, options)) return;
  const action = getFlashcardReviewShortcutAction({
    key: event.key,
    revealed: options.revealed,
    hasCurrentCard: options.hasCurrentCard,
    canUndoReview: options.canUndoReview,
    isPending: options.isPending,
    isDialogOpen: options.isDialogOpen,
    isEditableTarget: isEditableTarget(event.target),
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
  if (event.key !== "Escape") return false;
  if (options.isDialogOpen) return true;
  event.preventDefault();
  options.onExit();
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
  else if (action.type === "undo") options.onUndo();
  else options.onGrade(action.grade);
}
