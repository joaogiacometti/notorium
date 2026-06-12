"use client";

import { createContext, useContext } from "react";

interface ShortcutsDialogOpenProviderProps {
  shortcutsDialogOpen: boolean;
  children: React.ReactNode;
}

const ShortcutsDialogOpenContext = createContext(false);

export function ShortcutsDialogOpenProvider({
  shortcutsDialogOpen,
  children,
}: Readonly<ShortcutsDialogOpenProviderProps>) {
  return (
    <ShortcutsDialogOpenContext.Provider value={shortcutsDialogOpen}>
      {children}
    </ShortcutsDialogOpenContext.Provider>
  );
}

export function useShortcutsDialogOpen() {
  return useContext(ShortcutsDialogOpenContext);
}

const ShortcutsHelpOpenerContext = createContext<() => void>(() => {});

export function ShortcutsHelpOpenerProvider({
  openShortcutsHelp,
  children,
}: Readonly<{ openShortcutsHelp: () => void; children: React.ReactNode }>) {
  return (
    <ShortcutsHelpOpenerContext.Provider value={openShortcutsHelp}>
      {children}
    </ShortcutsHelpOpenerContext.Provider>
  );
}

/** Opens the keyboard-shortcuts help dialog from anywhere under the provider. */
export function useOpenShortcutsHelp() {
  return useContext(ShortcutsHelpOpenerContext);
}
