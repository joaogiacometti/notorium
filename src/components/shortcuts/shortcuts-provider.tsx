"use client";

import { useEffect, useState } from "react";
import { ShortcutsHelpDialog } from "./shortcuts-help-dialog";
import { ShortcutsDialogOpenProvider } from "./shortcuts-suspension-context";

interface ShortcutsProviderProps {
  children: React.ReactNode;
}

export function ShortcutsProvider({
  children,
}: Readonly<ShortcutsProviderProps>) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "?" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (isEditableTarget(e.target)) {
          return;
        }

        e.preventDefault();
        setShortcutsOpen(true);
      }
    }

    function isEditableTarget(target: EventTarget | null): boolean {
      let element: Element | null = null;

      if (target instanceof Element) {
        element = target;
      } else if (target instanceof Node) {
        element = target.parentElement;
      }

      if (!element) {
        return false;
      }

      return (
        element.closest("input, textarea, select, [contenteditable]") !== null
      );
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ShortcutsDialogOpenProvider shortcutsDialogOpen={shortcutsOpen}>
      {children}
      <ShortcutsHelpDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </ShortcutsDialogOpenProvider>
  );
}
