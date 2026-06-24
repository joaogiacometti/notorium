"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getOpenableDocuments } from "@/app/actions/documents";
import { getFlashcardsManagePage } from "@/app/actions/flashcards";
import { getSubjects } from "@/app/actions/subjects";
import { useOpenAccountSettings } from "@/components/account/account-settings-provider";
import {
  type PaletteAction,
  parseSubjectIdFromPath,
} from "@/components/navbar/command-palette-commands";
import {
  type ActiveCreateDialog,
  CommandPaletteDialogs,
} from "@/components/navbar/command-palette-dialogs";
import {
  DocumentPickerPage,
  FlashcardPickerPage,
  RootPage,
  SubjectPickerPage,
} from "@/components/navbar/command-palette-pages";
import { useThemeControl } from "@/components/navbar/use-theme-control";
import {
  useOpenShortcutsHelp,
  useShortcutsDialogOpen,
} from "@/components/shortcuts/shortcuts-suspension-context";
import { CommandDialog } from "@/components/ui/command";
import { useWindowManager } from "@/components/windows/window-manager-context";

interface CommandPaletteProps {
  userId: string;
  aiEnabled: boolean;
}

type PalettePage = "root" | "pick-subject" | "open-doc" | "edit-flashcard";

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

  const { data: subjects = [], isPending: isSubjectsPending } = useQuery({
    queryKey: ["command-palette-subjects", userId],
    queryFn: () => getSubjects(),
    enabled: open && userId.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  const { data: documents = [], isPending: isDocumentsPending } = useQuery({
    queryKey: ["command-palette-documents", userId],
    queryFn: () => getOpenableDocuments(),
    enabled: open && page === "open-doc" && userId.length > 0,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });

  const { data: flashcards = [], isPending: isFlashcardsPending } = useQuery({
    queryKey: ["command-palette-flashcards", userId, search],
    queryFn: async () => {
      const result = await getFlashcardsManagePage({
        pageIndex: 0,
        pageSize: 25,
        search,
      });

      if ("errorCode" in result) {
        return [];
      }

      return result.items;
    },
    enabled: open && page === "edit-flashcard" && userId.length > 0,
    staleTime: 1000 * 20,
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
    } else if (action.kind === "open-window-flashcard-edit") {
      goToPage("edit-flashcard");
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
            isLoading={isSubjectsPending}
            onPick={handleSubjectPicked}
          />
        ) : page === "open-doc" ? (
          <DocumentPickerPage
            search={search}
            onSearchChange={setSearch}
            documents={documents}
            isLoading={isDocumentsPending}
            onPick={(kind, docId) => {
              handleOpenChange(false);
              openWindow({ kind, docId });
            }}
          />
        ) : (
          <FlashcardPickerPage
            search={search}
            onSearchChange={setSearch}
            flashcards={flashcards}
            isLoading={isFlashcardsPending}
            onPick={(flashcard) => {
              handleOpenChange(false);
              openWindow({
                kind: "flashcard",
                docId: flashcard.id,
                title: flashcard.frontTitle ?? flashcard.frontExcerpt,
              });
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
