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
