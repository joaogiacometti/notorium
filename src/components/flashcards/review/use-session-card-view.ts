"use client";

import { useState } from "react";

/**
 * Holds the per-card view state shared by review and exam sessions: answer
 * revealed, inline editing, and the delete and reset dialogs.
 *
 * @example
 * const view = useSessionCardView();
 * view.resetCardViewState();
 */
export function useSessionCardView() {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  function resetCardViewState() {
    setRevealed(false);
    setEditing(false);
    setDeleteOpen(false);
    setResetOpen(false);
  }

  return {
    revealed,
    setRevealed,
    editing,
    setEditing,
    deleteOpen,
    setDeleteOpen,
    resetOpen,
    setResetOpen,
    isDialogOpen: editing || deleteOpen || resetOpen,
    resetCardViewState,
  };
}
