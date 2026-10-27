"use client";

import { useOpenAccountSettings } from "@/components/account/account-settings-provider";
import type {
  ContextFreeDialog,
  SearchCommandAction,
} from "@/components/navbar/search-commands";
import { useThemeControl } from "@/components/navbar/use-theme-control";
import { useOpenShortcutsHelp } from "@/components/shortcuts/shortcuts-suspension-context";

interface SearchCommandActionHandlers {
  onClose: () => void;
  onNavigate: (href: string) => void;
  onCreate: (dialog: ContextFreeDialog) => void;
}

/** Returns a dispatcher that runs a search command and closes the dialog. */
export function useSearchCommandActions({
  onClose,
  onNavigate,
  onCreate,
}: Readonly<SearchCommandActionHandlers>): (
  action: SearchCommandAction,
) => void {
  const openShortcutsHelp = useOpenShortcutsHelp();
  const openAccountSettings = useOpenAccountSettings();
  const { setAppTheme } = useThemeControl();

  return function runAction(action) {
    if (action.kind === "navigate") {
      onNavigate(action.href);
      return;
    }
    onClose();
    if (action.kind === "create") {
      onCreate(action.dialog);
    } else if (action.kind === "theme") {
      void setAppTheme(action.theme);
    } else if (action.kind === "open-settings") {
      openAccountSettings();
    } else {
      openShortcutsHelp();
    }
  };
}
