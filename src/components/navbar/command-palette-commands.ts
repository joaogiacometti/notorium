import {
  BookOpen,
  FileText,
  Home,
  Keyboard,
  LaptopMinimal,
  Layers,
  type LucideIcon,
  Moon,
  Sun,
  UserCog,
} from "lucide-react";
import type { AppTheme } from "@/lib/theme";

export type PaletteGroup = "Create" | "Go to" | "Settings";

/** Dialogs that open straight from the palette. */
export type ContextFreeDialog = "subject" | "flashcard" | "note";

export type PaletteAction =
  | { kind: "navigate"; href: string }
  | { kind: "create"; dialog: ContextFreeDialog }
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
    id: "create-note",
    label: "Create Note",
    group: "Create",
    keywords: ["new", "add", "create", "note", "document"],
    icon: FileText,
    action: { kind: "create", dialog: "note" },
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
