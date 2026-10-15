"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { SettingsDialog } from "@/components/account/settings-dialog";
import {
  resolveSettingsSection,
  type SettingsSectionId,
} from "@/components/account/settings-sections";
import { fetchAccountSettings } from "@/lib/read-api/account";

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
    queryFn: () => fetchAccountSettings(),
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
  const router = useRouter();

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
    const pathname = window.location.pathname;
    // Strip through the router, not window.history: this effect runs before the
    // Next.js router patches history, so a raw replaceState left the router on
    // the old URL and the next Server Action response restored `?settings=`.
    router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [openSettings, router, userId]);
}
