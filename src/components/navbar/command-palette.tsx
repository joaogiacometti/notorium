"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getSubjectOptions } from "@/app/actions/subjects";
import { useOpenAccountSettings } from "@/components/account/account-settings-provider";
import {
  type PaletteAction,
  parseSubjectIdFromPath,
} from "@/components/navbar/command-palette-commands";
import {
  type ActiveCreateDialog,
  CommandPaletteDialogs,
} from "@/components/navbar/command-palette-dialogs";
import { RootPage } from "@/components/navbar/command-palette-pages";
import { useThemeControl } from "@/components/navbar/use-theme-control";
import {
  useOpenShortcutsHelp,
  useShortcutsDialogOpen,
} from "@/components/shortcuts/shortcuts-suspension-context";
import { CommandDialog } from "@/components/ui/command";

interface CommandPaletteProps {
  userId: string;
  aiEnabled: boolean;
}

export function CommandPalette({
  userId,
  aiEnabled,
}: Readonly<CommandPaletteProps>) {
  const shortcutsSuspended = useShortcutsDialogOpen();
  const openShortcutsHelp = useOpenShortcutsHelp();
  const openAccountSettings = useOpenAccountSettings();
  const { setAppTheme } = useThemeControl();
  const router = useRouter();
  const pathname = usePathname();
  const [, startNavTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeDialog, setActiveDialog] = useState<ActiveCreateDialog | null>(
    null,
  );
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const { data: subjects = [] } = useQuery({
    queryKey: ["command-palette-subjects", userId],
    queryFn: () => getSubjectOptions(),
    enabled: (open || activeDialog !== null) && userId.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
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

  // cmdk keeps the search text in the shared Command context, so clear it on
  // close; otherwise the next open starts pre-filtered by the old query.
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
    }
  }

  function navigate(href: string) {
    handleOpenChange(false);
    startNavTransition(() => router.push(href));
  }

  function runAction(action: PaletteAction) {
    if (action.kind === "navigate") {
      navigate(action.href);
    } else if (action.kind === "create") {
      setSubjectId(parseSubjectIdFromPath(pathname));
      setActiveDialog(action.dialog);
      handleOpenChange(false);
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

  function closeActiveDialog() {
    setActiveDialog(null);
    setSubjectId(null);
  }

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Command Palette"
        description="Run a command or jump to a section"
      >
        <RootPage
          search={search}
          onSearchChange={setSearch}
          onRun={runAction}
        />
      </CommandDialog>
      <CommandPaletteDialogs
        activeDialog={activeDialog}
        subjectId={subjectId}
        subjects={subjects}
        aiEnabled={aiEnabled}
        onClose={closeActiveDialog}
        onNavigate={navigate}
      />
    </>
  );
}
