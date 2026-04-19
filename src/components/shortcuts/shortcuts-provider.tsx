"use client";

import { useEffect, useState } from "react";
import { isEditableTarget } from "@/lib/shortcuts/registry";
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
