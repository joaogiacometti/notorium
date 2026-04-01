"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatShortcutKeys,
  getShortcutsByCategory,
  ShortcutCategory,
} from "@/lib/shortcuts/registry";

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: Readonly<ShortcutsHelpDialogProps>) {
  const globalShortcuts = getShortcutsByCategory(ShortcutCategory.Global);
  const flashcardShortcuts = getShortcutsByCategory(
    ShortcutCategory.FlashcardReview,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogTitle className="text-lg font-semibold">
          Keyboard shortcuts
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Quick keyboard shortcuts to navigate the app faster.
        </DialogDescription>

        <div className="space-y-6 mt-4">
          {globalShortcuts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Global
              </h3>
              <div className="space-y-2">
                {globalShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {formatShortcutKeys(shortcut.keys).map((key) => (
                        <kbd
                          key={key}
                          className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {flashcardShortcuts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Flashcard Review
              </h3>
              <div className="space-y-2">
                {flashcardShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {formatShortcutKeys(shortcut.keys).map((key) => (
                        <kbd
                          key={key}
                          className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
