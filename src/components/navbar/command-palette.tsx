"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Network } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  getOpenableDocuments,
  type OpenableDocument,
} from "@/app/actions/documents";
import { getSubjects } from "@/app/actions/subjects";
import { useOpenAccountSettings } from "@/components/account/account-settings-provider";
import {
  type PaletteAction,
  type PaletteCommand,
  paletteCommands,
  paletteGroupOrder,
  parseSubjectIdFromPath,
} from "@/components/navbar/command-palette-commands";
import {
  type ActiveCreateDialog,
  CommandPaletteDialogs,
} from "@/components/navbar/command-palette-dialogs";
import { useThemeControl } from "@/components/navbar/use-theme-control";
import {
  useOpenShortcutsHelp,
  useShortcutsDialogOpen,
} from "@/components/shortcuts/shortcuts-suspension-context";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useWindowManager } from "@/components/windows/window-manager-context";

interface CommandPaletteProps {
  userId: string;
  aiEnabled: boolean;
}

type PalettePage = "root" | "pick-subject" | "open-doc";

export function CommandPalette({
  userId,
  aiEnabled,
}: Readonly<CommandPaletteProps>) {
  const shortcutsSuspended = useShortcutsDialogOpen();
  const openShortcutsHelp = useOpenShortcutsHelp();
  const openAccountSettings = useOpenAccountSettings();
  const { setAppTheme } = useThemeControl();
  const { openWindow } = useWindowManager();
  const router = useRouter();
  const pathname = usePathname();
  const [, startNavTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<PalettePage>("root");
  const [search, setSearch] = useState("");
  const [pendingScopedDialog, setPendingScopedDialog] =
    useState<ActiveCreateDialog | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveCreateDialog | null>(
    null,
  );
  const [subjectId, setSubjectId] = useState<string | null>(null);
  // When true, a successful note/mindmap create opens a window instead of
  // navigating to its page.
  const [createInWindow, setCreateInWindow] = useState(false);

  const { data: subjects = [] } = useQuery({
    queryKey: ["command-palette-subjects", userId],
    queryFn: () => getSubjects(),
    enabled: open && userId.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["command-palette-documents", userId],
    queryFn: () => getOpenableDocuments(),
    enabled: open && page === "open-doc" && userId.length > 0,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "p" || !(e.metaKey || e.ctrlKey)) {
        return;
      }
      if (shortcutsSuspended || activeDialog !== null) {
        return;
      }
      e.preventDefault();
      setOpen((prev) => !prev);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcutsSuspended, activeDialog]);

  // cmdk keeps the search text in the shared Command context, so the value must
  // be reset whenever the active page changes; otherwise the text typed to find
  // a command leaks into the subject picker and filters out every subject.
  function goToPage(nextPage: PalettePage) {
    setPage(nextPage);
    setSearch("");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      goToPage("root");
      setPendingScopedDialog(null);
    }
  }

  function navigate(href: string) {
    handleOpenChange(false);
    startNavTransition(() => router.push(href));
  }

  function openScopedDialog(dialog: ActiveCreateDialog, forSubjectId: string) {
    setSubjectId(forSubjectId);
    setActiveDialog(dialog);
    handleOpenChange(false);
  }

  function startScopedCreate(dialog: ActiveCreateDialog) {
    const routeSubjectId = parseSubjectIdFromPath(pathname);
    if (routeSubjectId) {
      openScopedDialog(dialog, routeSubjectId);
    } else {
      setPendingScopedDialog(dialog);
      goToPage("pick-subject");
    }
  }

  function openDocumentWindow(kind: "mindmap" | "note", docId: string) {
    setCreateInWindow(false);
    closeActiveDialog();
    openWindow({ kind, docId });
  }

  function runAction(action: PaletteAction) {
    if (action.kind === "navigate") {
      navigate(action.href);
    } else if (action.kind === "create") {
      setCreateInWindow(false);
      setActiveDialog(action.dialog);
      handleOpenChange(false);
    } else if (action.kind === "create-in-subject") {
      setCreateInWindow(false);
      startScopedCreate(action.dialog);
    } else if (action.kind === "open-window-create") {
      if (action.create === "flashcard") {
        handleOpenChange(false);
        openWindow({ kind: "flashcard" });
      } else {
        setCreateInWindow(true);
        startScopedCreate(action.create);
      }
    } else if (action.kind === "open-window-existing") {
      goToPage("open-doc");
    } else if (action.kind === "theme") {
      void setAppTheme(action.theme);
      handleOpenChange(false);
    } else if (action.kind === "open-settings") {
      handleOpenChange(false);
      openAccountSettings();
    } else {
      handleOpenChange(false);
      openShortcutsHelp();
    }
  }

  function handleSubjectPicked(pickedSubjectId: string) {
    if (pendingScopedDialog) {
      openScopedDialog(pendingScopedDialog, pickedSubjectId);
      setPendingScopedDialog(null);
    }
  }

  function closeActiveDialog() {
    setActiveDialog(null);
    setSubjectId(null);
    setCreateInWindow(false);
  }

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Command Palette"
        description="Run a command or jump to a section"
      >
        {page === "root" ? (
          <RootPage
            search={search}
            onSearchChange={setSearch}
            onRun={runAction}
          />
        ) : page === "pick-subject" ? (
          <SubjectPickerPage
            search={search}
            onSearchChange={setSearch}
            subjects={subjects}
            onPick={handleSubjectPicked}
          />
        ) : (
          <DocumentPickerPage
            search={search}
            onSearchChange={setSearch}
            documents={documents}
            onPick={(kind, docId) => {
              handleOpenChange(false);
              openWindow({ kind, docId });
            }}
          />
        )}
      </CommandDialog>
      <CommandPaletteDialogs
        activeDialog={activeDialog}
        subjectId={subjectId}
        subjects={subjects}
        aiEnabled={aiEnabled}
        onClose={closeActiveDialog}
        onNavigate={navigate}
        createInWindow={createInWindow}
        onOpenDocumentWindow={openDocumentWindow}
      />
    </>
  );
}

interface PaletteSearchInputProps {
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * Search box that grabs focus on mount. Radix only auto-focuses the first input
 * when the dialog opens, so swapping palette pages would otherwise leave the new
 * input unfocused, breaking arrow-key navigation and typing until a manual click.
 *
 * @example
 * <PaletteSearchInput placeholder="Select a subject..." value={s} onValueChange={setS} />
 */
function PaletteSearchInput({
  placeholder,
  value,
  onValueChange,
}: Readonly<PaletteSearchInputProps>) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <CommandInput
      ref={inputRef}
      placeholder={placeholder}
      value={value}
      onValueChange={onValueChange}
    />
  );
}

interface RootPageProps {
  search: string;
  onSearchChange: (value: string) => void;
  onRun: (action: PaletteAction) => void;
}

function RootPage({ search, onSearchChange, onRun }: Readonly<RootPageProps>) {
  return (
    <>
      <PaletteSearchInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={onSearchChange}
      />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        {paletteGroupOrder.map((group) => (
          <CommandGroup key={group} heading={group}>
            {paletteCommands
              .filter((command) => command.group === group)
              .map((command) => (
                <PaletteCommandItem
                  key={command.id}
                  command={command}
                  onRun={onRun}
                />
              ))}
          </CommandGroup>
        ))}
      </CommandList>
    </>
  );
}

interface PaletteCommandItemProps {
  command: PaletteCommand;
  onRun: (action: PaletteAction) => void;
}

function PaletteCommandItem({
  command,
  onRun,
}: Readonly<PaletteCommandItemProps>) {
  const Icon = command.icon;
  return (
    <CommandItem
      value={command.label}
      keywords={command.keywords}
      onSelect={() => onRun(command.action)}
      className="cursor-pointer gap-2"
    >
      <Icon className="!size-4 text-muted-foreground" />
      <span>{command.label}</span>
    </CommandItem>
  );
}

interface SubjectPickerPageProps {
  search: string;
  onSearchChange: (value: string) => void;
  subjects: { id: string; name: string }[];
  onPick: (subjectId: string) => void;
}

function SubjectPickerPage({
  search,
  onSearchChange,
  subjects,
  onPick,
}: Readonly<SubjectPickerPageProps>) {
  return (
    <>
      <PaletteSearchInput
        placeholder="Select a subject..."
        value={search}
        onValueChange={onSearchChange}
      />
      <CommandList>
        <CommandEmpty>No subjects found.</CommandEmpty>
        <CommandGroup heading="Select a subject">
          {subjects.map((subject) => (
            <CommandItem
              key={subject.id}
              value={subject.name}
              onSelect={() => onPick(subject.id)}
              className="cursor-pointer"
            >
              {subject.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </>
  );
}

interface DocumentPickerPageProps {
  search: string;
  onSearchChange: (value: string) => void;
  documents: OpenableDocument[];
  onPick: (kind: "mindmap" | "note", docId: string) => void;
}

function DocumentPickerPage({
  search,
  onSearchChange,
  documents,
  onPick,
}: Readonly<DocumentPickerPageProps>) {
  return (
    <>
      <PaletteSearchInput
        placeholder="Open a document in a window..."
        value={search}
        onValueChange={onSearchChange}
      />
      <CommandList>
        <CommandEmpty>No documents found.</CommandEmpty>
        <CommandGroup heading="Open in window">
          {documents.map((document) => {
            const Icon = document.kind === "mindmap" ? Network : FileText;
            return (
              <CommandItem
                key={`${document.kind}-${document.id}`}
                value={`${document.title} ${document.id}`}
                onSelect={() => onPick(document.kind, document.id)}
                className="cursor-pointer gap-2"
              >
                <Icon className="!size-4 text-muted-foreground" />
                <span className="truncate">{document.title || "Untitled"}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </>
  );
}
