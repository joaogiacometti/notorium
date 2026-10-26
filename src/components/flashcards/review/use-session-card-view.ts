"use client";

import { useState } from "react";

/**
 * Holds the per-card view state shared by review and exam sessions: answer
 * revealed plus the edit, delete and reset dialogs.
 *
 * @example
 * const view = useSessionCardView();
 * view.resetCardViewState();
 */
export function useSessionCardView() {
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  function resetCardViewState() {
    setRevealed(false);
    setEditOpen(false);
    setDeleteOpen(false);
    setResetOpen(false);
  }

  return {
    revealed,
    setRevealed,
    editOpen,
    setEditOpen,
    deleteOpen,
    setDeleteOpen,
    resetOpen,
    setResetOpen,
    isDialogOpen: editOpen || deleteOpen || resetOpen,
    resetCardViewState,
  };
}
