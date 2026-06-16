import {
  Archive,
  BookOpen,
  BookText,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderPlus,
  Keyboard,
  LaptopMinimal,
  Layers,
  type LucideIcon,
  Moon,
  Network,
  Sun,
  UserCog,
} from "lucide-react";
import type { AppTheme } from "@/lib/theme";

export type PaletteGroup = "Create" | "Go to" | "Settings";

/** Dialogs that need no context and can open straight from the palette. */
export type ContextFreeDialog =
  | "subject"
  | "flashcard"
  | "deck"
  | "assessment"
  | "book";

/** Dialogs that require a subject, resolved from route or a picker step. */
export type SubjectScopedDialog = "note" | "mindmap";

export type PaletteAction =
  | { kind: "navigate"; href: string }
  | { kind: "create"; dialog: ContextFreeDialog }
  | { kind: "create-in-subject"; dialog: SubjectScopedDialog }
  | { kind: "theme"; theme: AppTheme }
  | { kind: "shortcuts-help" };

export interface PaletteCommand {
  id: string;
  label: string;
  group: PaletteGroup;
  keywords: string[];
  icon: LucideIcon;
  action: PaletteAction;
}

export const paletteCommands: PaletteCommand[] = [
  {
    id: "create-subject",
    label: "Create Subject",
    group: "Create",
    keywords: ["new", "add", "create", "subject", "course"],
    icon: BookOpen,
    action: { kind: "create", dialog: "subject" },
  },
  {
    id: "create-flashcard",
    label: "Create Flashcard",
    group: "Create",
    keywords: ["new", "add", "create", "flashcard", "card"],
    icon: Layers,
    action: { kind: "create", dialog: "flashcard" },
  },
  {
    id: "create-deck",
    label: "Create Deck",
    group: "Create",
    keywords: ["new", "add", "create", "deck", "folder"],
    icon: FolderPlus,
    action: { kind: "create", dialog: "deck" },
  },
  {
    id: "create-assessment",
    label: "Create Assessment",
    group: "Create",
    keywords: ["new", "add", "create", "assessment", "exam", "test", "quiz"],
    icon: ClipboardList,
    action: { kind: "create", dialog: "assessment" },
  },
  {
    id: "create-note",
    label: "Create Note",
    group: "Create",
    keywords: ["new", "add", "create", "note", "document"],
    icon: FileText,
    action: { kind: "create-in-subject", dialog: "note" },
  },
  {
    id: "create-mindmap",
    label: "Create Mindmap",
    group: "Create",
    keywords: ["new", "add", "create", "mindmap", "map", "diagram"],
    icon: Network,
    action: { kind: "create-in-subject", dialog: "mindmap" },
  },
  {
    id: "goto-subjects",
    label: "Go to Subjects",
    group: "Go to",
    keywords: ["subjects", "courses", "home"],
    icon: BookOpen,
    action: { kind: "navigate", href: "/subjects" },
  },
  {
    id: "goto-flashcards",
    label: "Go to Flashcards",
    group: "Go to",
    keywords: ["flashcards", "review", "cards", "decks"],
    icon: Layers,
    action: { kind: "navigate", href: "/flashcards" },
  },
  {
    id: "goto-planning",
    label: "Go to Planning",
    group: "Go to",
    keywords: ["planning", "calendar", "assessments", "schedule"],
    icon: CalendarDays,
    action: { kind: "navigate", href: "/planning" },
  },
  {
    id: "add-book",
    label: "Add Book",
    group: "Create",
    keywords: ["new", "add", "create", "book", "pdf", "upload", "library"],
    icon: BookText,
    action: { kind: "create", dialog: "book" },
  },
  {
    id: "goto-library",
    label: "Go to Library",
    group: "Go to",
    keywords: ["library", "books", "reading", "pdf"],
    icon: BookText,
    action: { kind: "navigate", href: "/library" },
  },
  {
    id: "goto-archived",
    label: "Go to Archived Subjects",
    group: "Go to",
    keywords: ["archived", "subjects", "hidden"],
    icon: Archive,
    action: { kind: "navigate", href: "/subjects/archived" },
  },
  {
    id: "goto-account",
    label: "Go to Account",
    group: "Go to",
    keywords: ["account", "settings", "profile", "preferences"],
    icon: UserCog,
    action: { kind: "navigate", href: "/account" },
  },
  {
    id: "theme-light",
    label: "Theme: Light",
    group: "Settings",
    keywords: ["theme", "appearance", "light", "bright"],
    icon: Sun,
    action: { kind: "theme", theme: "light" },
  },
  {
    id: "theme-dark",
    label: "Theme: Dark",
    group: "Settings",
    keywords: ["theme", "appearance", "dark", "night"],
    icon: Moon,
    action: { kind: "theme", theme: "dark" },
  },
  {
    id: "theme-system",
    label: "Theme: System",
    group: "Settings",
    keywords: ["theme", "appearance", "system", "auto"],
    icon: LaptopMinimal,
    action: { kind: "theme", theme: "system" },
  },
  {
    id: "shortcuts-help",
    label: "Show Keyboard Shortcuts",
    group: "Settings",
    keywords: ["keyboard", "shortcuts", "help", "keys"],
    icon: Keyboard,
    action: { kind: "shortcuts-help" },
  },
];

/** Group order for rendering the palette. */
export const paletteGroupOrder: PaletteGroup[] = [
  "Create",
  "Go to",
  "Settings",
];

/**
 * Resolve the active subject id from a route so subject-scoped creates can skip
 * the picker. Returns null off subject pages and on the archived list.
 *
 * @example
 * parseSubjectIdFromPath("/subjects/abc/documents"); // "abc"
 */
export function parseSubjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/subjects\/([^/]+)/);
  const segment = match?.[1];
  if (!segment || segment === "archived") {
    return null;
  }
  return segment;
}
