import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  Home,
  Keyboard,
  LaptopMinimal,
  Layers,
  LayoutGrid,
  type LucideIcon,
  Moon,
  Network,
  Sun,
  UserCog,
} from "lucide-react";
import type { AppTheme } from "@/lib/theme";

export type PaletteGroup = "Create" | "Windows" | "Go to" | "Settings";

/** Editor kinds that can be created or opened inside a floating window. */
export type WindowCreateKind = "mindmap" | "note" | "flashcard";

/** Dialogs that open straight from the palette. */
export type ContextFreeDialog =
  | "subject"
  | "flashcard"
  | "assessment"
  | "note"
  | "mindmap";

export type PaletteAction =
  | { kind: "navigate"; href: string }
  | { kind: "create"; dialog: ContextFreeDialog }
  | { kind: "open-window-create"; create: WindowCreateKind }
  | { kind: "open-window-existing" }
  | { kind: "open-window-flashcard-edit" }
  | { kind: "theme"; theme: AppTheme }
  | { kind: "open-settings" }
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
    action: { kind: "create", dialog: "note" },
  },
  {
    id: "create-mindmap",
    label: "Create Mindmap",
    group: "Create",
    keywords: ["new", "add", "create", "mindmap", "map", "diagram"],
    icon: Network,
    action: { kind: "create", dialog: "mindmap" },
  },
  {
    id: "window-mindmap",
    label: "New Mindmap in Window",
    group: "Windows",
    keywords: ["window", "overlay", "mindmap", "multitask", "reader", "float"],
    icon: Network,
    action: { kind: "open-window-create", create: "mindmap" },
  },
  {
    id: "window-note",
    label: "New Note in Window",
    group: "Windows",
    keywords: ["window", "overlay", "note", "multitask", "reader", "float"],
    icon: FileText,
    action: { kind: "open-window-create", create: "note" },
  },
  {
    id: "window-flashcard",
    label: "New Flashcard in Window",
    group: "Windows",
    keywords: [
      "window",
      "overlay",
      "flashcard",
      "multitask",
      "reader",
      "float",
    ],
    icon: Layers,
    action: { kind: "open-window-create", create: "flashcard" },
  },
  {
    id: "window-open-document",
    label: "Open Document in Window",
    group: "Windows",
    keywords: ["window", "overlay", "open", "note", "mindmap", "existing"],
    icon: LayoutGrid,
    action: { kind: "open-window-existing" },
  },
  {
    id: "window-edit-flashcard",
    label: "Edit Flashcard in Window",
    group: "Windows",
    keywords: [
      "window",
      "overlay",
      "open",
      "edit",
      "flashcard",
      "card",
      "existing",
    ],
    icon: Layers,
    action: { kind: "open-window-flashcard-edit" },
  },
  {
    id: "goto-home",
    label: "Go to Home",
    group: "Go to",
    keywords: ["home", "dashboard", "overview", "start"],
    icon: Home,
    action: { kind: "navigate", href: "/" },
  },
  {
    id: "goto-flashcards",
    label: "Go to Flashcards",
    group: "Go to",
    keywords: ["flashcards", "review", "cards", "subjects"],
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
    id: "open-settings",
    label: "Open Settings",
    group: "Settings",
    keywords: ["account", "settings", "profile", "preferences"],
    icon: UserCog,
    action: { kind: "open-settings" },
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
  "Windows",
  "Go to",
  "Settings",
];

/**
 * Resolve the active subject id from a route so subject-scoped creates can skip
 * the picker. Returns null off subject pages.
 *
 * @example
 * parseSubjectIdFromPath("/subjects/abc/documents/notes/n1"); // "abc"
 */
export function parseSubjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/subjects\/([^/]+)/);
  const segment = match?.[1];
  if (!segment) {
    return null;
  }
  return segment;
}
