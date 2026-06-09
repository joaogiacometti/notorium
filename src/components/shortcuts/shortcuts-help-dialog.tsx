"use client";

import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  displayShortcutKeys,
  getActiveShortcutCategories,
  getShortcutsByCategory,
  type Shortcut,
  type ShortcutCategorySection,
  shortcutCategorySections,
} from "@/lib/shortcuts/registry";
import { cn } from "@/lib/utils";

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: Readonly<ShortcutsHelpDialogProps>) {
  const pathname = usePathname();
  const activeCategories = new Set(getActiveShortcutCategories(pathname));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogTitle className="text-lg font-semibold">
          Keyboard shortcuts
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Shortcuts and typed triggers, grouped by where they apply. Groups
          available on the current page are highlighted.
        </DialogDescription>

        <div className="grid items-start gap-4 md:grid-cols-2 mt-2 overflow-y-auto p-1 -m-1">
          {shortcutCategorySections.map((section) => (
            <ShortcutCategorySectionView
              key={section.category}
              section={section}
              isActive={activeCategories.has(section.category)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ShortcutCategorySectionViewProps {
  section: ShortcutCategorySection;
  isActive: boolean;
}

function ShortcutCategorySectionView({
  section,
  isActive,
}: Readonly<ShortcutCategorySectionViewProps>) {
  const shortcuts = getShortcutsByCategory(section.category);

  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-lg border bg-card",
        isActive && "border-primary/40 ring-1 ring-primary/20",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 rounded-t-lg border-b px-4 py-2.5",
          isActive ? "bg-primary/5" : "bg-muted/40",
        )}
      >
        <h3
          className={cn(
            "text-sm",
            isActive ? "font-bold" : "font-medium text-muted-foreground",
          )}
        >
          {section.label}
        </h3>
        {isActive && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            This page
          </span>
        )}
      </header>
      <div className="divide-y divide-border/60 px-4">
        {shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.id} shortcut={shortcut} />
        ))}
      </div>
    </section>
  );
}

interface ShortcutRowProps {
  shortcut: Shortcut;
}

function ShortcutRow({ shortcut }: Readonly<ShortcutRowProps>) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm">{shortcut.description}</span>
      <div className="flex shrink-0 gap-1">
        {displayShortcutKeys(shortcut).map((key) => (
          <kbd
            key={key}
            className="pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground shadow-xs"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
