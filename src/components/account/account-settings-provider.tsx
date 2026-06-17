"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getAccountSettings } from "@/app/actions/account";
import { SettingsDialog } from "@/components/account/settings-dialog";
import {
  resolveSettingsSection,
  type SettingsSectionId,
} from "@/components/account/settings-sections";

type OpenAccountSettings = (section?: SettingsSectionId) => void;

const OpenAccountSettingsContext = createContext<OpenAccountSettings>(() => {});

/** Opens the account settings dialog (optionally to a section) from anywhere. */
export function useOpenAccountSettings() {
  return useContext(OpenAccountSettingsContext);
}

interface AccountSettingsProviderProps {
  userId: string;
  children: React.ReactNode;
}

/**
 * Holds the settings dialog state, lazily fetches its data when opened, and
 * exposes an opener via context. Also honours a `?settings=<section>` deep link
 * (used by reminder emails) by opening the dialog once on mount.
 */
export function AccountSettingsProvider({
  userId,
  children,
}: Readonly<AccountSettingsProviderProps>) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("account");

  const openSettings = useCallback<OpenAccountSettings>((section) => {
    setActiveSection(section ?? "account");
    setOpen(true);
  }, []);

  useDeepLinkedSettings(openSettings, userId);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["account-settings", userId],
    queryFn: () => getAccountSettings(),
    enabled: open && userId.length > 0,
    staleTime: 1000 * 30,
  });

  return (
    <OpenAccountSettingsContext.Provider value={openSettings}>
      {children}
      {userId.length > 0 && (
        <SettingsDialog
          open={open}
          onOpenChange={setOpen}
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          settings={settings}
          isLoading={isLoading}
        />
      )}
    </OpenAccountSettingsContext.Provider>
  );
}

/**
 * Open the dialog once if the URL carries `?settings=<section>`, then strip the
 * param so a refresh or back navigation does not reopen it.
 */
function useDeepLinkedSettings(
  openSettings: OpenAccountSettings,
  userId: string,
) {
  useEffect(() => {
    if (userId.length === 0) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("settings");
    if (requested === null) {
      return;
    }
    openSettings(resolveSettingsSection(requested));
    params.delete("settings");
    const query = params.toString();
    const next = query.length > 0 ? `?${query}` : window.location.pathname;
    window.history.replaceState(null, "", next);
  }, [openSettings, userId]);
}
