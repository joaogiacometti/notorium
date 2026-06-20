"use client";

import { SearchIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getActiveShortcutCategories,
  getShortcutsByCategory,
  resolvePlatformShortcutKeys,
  type Shortcut,
  ShortcutCategory,
  type ShortcutCategorySection,
  shortcutCategorySections,
} from "@/lib/shortcuts/registry";
import { useIsMac } from "@/lib/shortcuts/use-is-mac";
import { cn } from "@/lib/utils";

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function matchesQuery(
  shortcut: Shortcut,
  isMac: boolean,
  query: string,
): boolean {
  if (!query) {
    return true;
  }
  if (shortcut.description.toLowerCase().includes(query)) {
    return true;
  }
  return resolvePlatformShortcutKeys(shortcut, isMac).some((key) =>
    key.toLowerCase().includes(query),
  );
}

function visibleShortcuts(
  category: ShortcutCategory,
  isMac: boolean,
  query: string,
): Shortcut[] {
  return getShortcutsByCategory(category).filter(
    (shortcut) => !shortcut.universal && matchesQuery(shortcut, isMac, query),
  );
}

/** First current-page category, falling back to Global, used as default tab. */
function defaultCategory(pathname: string): ShortcutCategory {
  const active = getActiveShortcutCategories(pathname);
  return (
    active.find((category) => category !== ShortcutCategory.Global) ??
    ShortcutCategory.Global
  );
}

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: Readonly<ShortcutsHelpDialogProps>) {
  const pathname = usePathname();
  const isMac = useIsMac();
  const activeCategories = new Set(getActiveShortcutCategories(pathname));
  const [selected, setSelected] = useState<ShortcutCategory>(() =>
    defaultCategory(pathname),
  );
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const searchGroups = shortcutCategorySections
    .map((section) => ({
      section,
      isActive: activeCategories.has(section.category),
      shortcuts: visibleShortcuts(section.category, isMac, normalizedQuery),
    }))
    .filter((group) => group.shortcuts.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[34rem] max-h-[85vh] gap-0 flex flex-col overflow-hidden p-0">
        <div className="flex flex-col gap-0.5 border-b px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold leading-none">
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pick a context on the left, or search across all of them.
          </DialogDescription>
        </div>

        <div className="flex min-h-0 flex-1">
          <CategoryNav
            sections={shortcutCategorySections}
            activeCategories={activeCategories}
            selected={selected}
            disabled={isSearching}
            onSelect={setSelected}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b p-3">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search all shortcuts..."
                  className="pl-9"
                  aria-label="Search shortcuts"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
              {isSearching ? (
                <SearchResults
                  groups={searchGroups}
                  query={query}
                  isMac={isMac}
                />
              ) : (
                <ShortcutList
                  shortcuts={visibleShortcuts(selected, isMac, "")}
                  isMac={isMac}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CategoryNavProps {
  sections: ShortcutCategorySection[];
  activeCategories: Set<ShortcutCategory>;
  selected: ShortcutCategory;
  disabled: boolean;
  onSelect: (category: ShortcutCategory) => void;
}

function CategoryNav({
  sections,
  activeCategories,
  selected,
  disabled,
  onSelect,
}: Readonly<CategoryNavProps>) {
  return (
    <nav className="w-44 shrink-0 overflow-y-auto border-r p-2">
      {sections.map((section) => {
        const isActive = activeCategories.has(section.category);
        const isSelected = !disabled && section.category === selected;
        return (
          <button
            key={section.category}
            type="button"
            onClick={() => onSelect(section.category)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
              isSelected
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <span className="truncate">{section.label}</span>
            {isActive && (
              <>
                <span className="sr-only">Available on this page</span>
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-primary"
                />
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}

interface SearchResultsProps {
  groups: {
    section: ShortcutCategorySection;
    isActive: boolean;
    shortcuts: Shortcut[];
  }[];
  query: string;
  isMac: boolean;
}

function SearchResults({ groups, query, isMac }: Readonly<SearchResultsProps>) {
  if (groups.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No shortcuts match “{query.trim()}”.
      </p>
    );
  }
  return (
    <>
      {groups.map((group) => (
        <section key={group.section.category}>
          <header className="mb-1 flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.section.label}
            </h3>
            {group.isActive && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
          </header>
          <ShortcutList shortcuts={group.shortcuts} isMac={isMac} />
        </section>
      ))}
    </>
  );
}

interface ShortcutListProps {
  shortcuts: Shortcut[];
  isMac: boolean;
}

function ShortcutList({ shortcuts, isMac }: Readonly<ShortcutListProps>) {
  return (
    <div className="divide-y divide-border/60">
      {shortcuts.map((shortcut) => (
        <ShortcutRow key={shortcut.id} shortcut={shortcut} isMac={isMac} />
      ))}
    </div>
  );
}

interface ShortcutRowProps {
  shortcut: Shortcut;
  isMac: boolean;
}

function ShortcutRow({ shortcut, isMac }: Readonly<ShortcutRowProps>) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-foreground/90">{shortcut.description}</span>
      <div className="flex shrink-0 items-center gap-1">
        {resolvePlatformShortcutKeys(shortcut, isMac).map((key) => (
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
