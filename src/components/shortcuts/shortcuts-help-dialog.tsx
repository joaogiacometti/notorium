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
      <DialogContent className="sm:max-w-6xl max-h-[88vh] flex flex-col">
        <div className="flex flex-col gap-0.5">
          <DialogTitle className="text-lg font-semibold leading-none">
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Shortcuts available on this page are highlighted.
          </DialogDescription>
        </div>

        <div className="mt-3 overflow-y-auto p-1 -m-1 md:columns-2 lg:columns-3 [column-gap:1rem]">
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
        "mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-card shadow-xs transition-colors",
        isActive && "border-primary/40 ring-1 ring-primary/20",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 border-b px-4 py-2.5",
          isActive ? "bg-primary/5" : "bg-muted/40",
        )}
      >
        <h3
          className={cn(
            "text-sm",
            isActive
              ? "font-semibold text-foreground"
              : "font-medium text-muted-foreground",
          )}
        >
          {section.label}
        </h3>
        {isActive && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
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
    <div className="group flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-foreground/90">{shortcut.description}</span>
      <div className="flex shrink-0 items-center gap-1">
        {displayShortcutKeys(shortcut).map((key) => (
          <kbd
            key={key}
            className="pointer-events-none inline-flex h-6 min-w-6 select-none items-center justify-center gap-1 rounded-md border border-b-2 bg-muted px-1.5 font-mono text-xs font-semibold text-muted-foreground shadow-xs"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
