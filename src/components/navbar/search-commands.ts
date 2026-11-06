import {
  FileText,
  FileType,
  FolderPlus,
  Home,
  Keyboard,
  LaptopMinimal,
  Layers,
  type LucideIcon,
  Moon,
  Sun,
  UserCog,
} from "lucide-react";
import { includesFoldedText } from "@/lib/search/fold";
import type { AppTheme } from "@/lib/theme";

export type SearchCommandGroup = "Create" | "Go to" | "Settings";

/** Dialogs that open straight from a search command. */
export type ContextFreeDialog = "folder" | "flashcard" | "note" | "pdf";

export type SearchCommandAction =
  | { kind: "navigate"; href: string }
  | { kind: "create"; dialog: ContextFreeDialog }
  | { kind: "theme"; theme: AppTheme }
  | { kind: "open-settings" }
  | { kind: "shortcuts-help" };

export interface SearchCommand {
  id: string;
  label: string;
  group: SearchCommandGroup;
  keywords: string[];
  icon: LucideIcon;
  action: SearchCommandAction;
}

export const searchCommands: SearchCommand[] = [
  {
    id: "create-folder",
    label: "Create Folder",
    group: "Create",
    keywords: ["new", "add", "create", "folder", "directory", "organize"],
    icon: FolderPlus,
    action: { kind: "create", dialog: "folder" },
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
    id: "create-pdf",
    label: "Create PDF",
    group: "Create",
    keywords: ["new", "add", "create", "upload", "pdf", "book", "document"],
    icon: FileType,
    action: { kind: "create", dialog: "pdf" },
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
    keywords: ["flashcards", "review", "cards", "folders"],
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

/** Group order for rendering commands in the search dialog. */
export const searchCommandGroupOrder: SearchCommandGroup[] = [
  "Create",
  "Go to",
  "Settings",
];

/**
 * Commands whose label or keywords contain `query`, ignoring case and accents.
 * A blank query returns every command.
 *
 * @example
 * filterSearchCommands("THEME").map((command) => command.id); // theme commands
 */
export function filterSearchCommands(query: string): SearchCommand[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return searchCommands;
  }
  return searchCommands.filter((command) =>
    [command.label, ...command.keywords].some((text) =>
      includesFoldedText(text, trimmed),
    ),
  );
}
