"use client";

import { Loader2, Search, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { AccountAvatar } from "@/components/account/account-avatar";
import { AccountProfileCard } from "@/components/account/account-profile-card";
import { AppearanceCard } from "@/components/account/appearance-card";
import { DangerZoneCard } from "@/components/account/danger-zone-card";
import { FlashcardOptimizationCard } from "@/components/account/flashcard-optimization-card";
import {
  SettingsPage,
  SettingsSearchProvider,
} from "@/components/account/settings-section";
import {
  type SettingsSection,
  type SettingsSectionId,
  settingsSections,
} from "@/components/account/settings-sections";
import { TimeZoneCard } from "@/components/account/time-zone-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AccountSettings } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: SettingsSectionId;
  onSelectSection: (section: SettingsSectionId) => void;
  settings: AccountSettings | undefined;
  isLoading: boolean;
  onRetry: () => void;
}

/**
 * Settings overlay: a sidebar (search, grouped section list, signed-in account)
 * on the left and either the active section's cards or cross-section search
 * results on the right.
 *
 * @example
 * <SettingsDialog open={open} onOpenChange={setOpen} activeSection="account"
 *   onSelectSection={setSection} settings={data} isLoading={isPending}
 *   onRetry={refetch} />
 */
export function SettingsDialog({
  open,
  onOpenChange,
  activeSection,
  onSelectSection,
  settings,
  isLoading,
  onRetry,
}: Readonly<SettingsDialogProps>) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery("");
    }
    onOpenChange(nextOpen);
  }

  function handleSelectSection(section: SettingsSectionId) {
    setQuery("");
    onSelectSection(section);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[85vh] max-h-[42rem] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl sm:flex-row">
        <SettingsSidebar
          sections={settingsSections}
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          query={query}
          onQueryChange={setQuery}
          settings={settings}
        />
        <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:px-8 sm:py-7">
          <DialogDescription className="sr-only">
            Manage your account, appearance, and flashcard settings.
          </DialogDescription>
          <SettingsSearchProvider query={query}>
            {searching && (
              <h2 className="mb-4 text-base font-semibold tracking-tight">
                {`"${query.trim()}"`}
              </h2>
            )}
            <SettingsSectionContent
              activeSection={searching ? "all" : activeSection}
              settings={settings}
              isLoading={isLoading}
              onRetry={onRetry}
            />
          </SettingsSearchProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const sectionGroups = [
  ...new Set(settingsSections.map((section) => section.group)),
];

interface SettingsSidebarProps {
  sections: SettingsSection[];
  activeSection: SettingsSectionId;
  onSelectSection: (section: SettingsSectionId) => void;
  query: string;
  onQueryChange: (query: string) => void;
  settings: AccountSettings | undefined;
}

function SettingsSidebar({
  sections,
  activeSection,
  onSelectSection,
  query,
  onQueryChange,
  settings,
}: Readonly<SettingsSidebarProps>) {
  const searching = query.trim().length > 0;
  return (
    <nav className="flex shrink-0 flex-col border-b bg-muted/50 p-2 sm:w-56 sm:border-r sm:border-b-0 sm:p-3">
      <DialogTitle className="px-2 pb-2">Settings</DialogTitle>
      <div className="relative px-1 sm:px-0">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground sm:left-2.5" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search"
          aria-label="Search settings"
          className={cn("h-8 pl-8", searching && "pr-8")}
        />
        {searching ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 flex size-4 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground sm:right-2.5"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      {searching ? null : (
        <div className="mt-2 flex gap-1 overflow-x-auto sm:mt-3 sm:block sm:space-y-3 sm:overflow-visible">
          {sectionGroups.map((group) => (
            <div key={group} className="contents sm:block">
              <p className="hidden px-2 pb-1 text-xs font-medium text-muted-foreground sm:block">
                {group}
              </p>
              <div className="contents sm:grid sm:gap-0.5">
                {sections
                  .filter((section) => section.group === group)
                  .map((section) => {
                    const Icon = section.icon;
                    const active = section.id === activeSection;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => onSelectSection(section.id)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
                          active && "bg-muted font-medium text-foreground",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {section.label}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
      {settings ? (
        <div className="mt-auto hidden items-center gap-2.5 border-t px-1 pt-3 sm:flex">
          <AccountAvatar name={settings.name} className="size-8 text-xs" />
          <div className="min-w-0 text-sm">
            <p className="truncate">{settings.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {settings.email}
            </p>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

interface SettingsSectionContentProps {
  activeSection: SettingsSectionId | "all";
  settings: AccountSettings | undefined;
  isLoading: boolean;
  onRetry: () => void;
}

function SettingsSectionContent({
  activeSection,
  settings,
  isLoading,
  onRetry,
}: Readonly<SettingsSectionContentProps>) {
  const searching = activeSection === "all";
  const shows = (section: SettingsSectionId) =>
    searching || activeSection === section;

  if (activeSection === "appearance") {
    return (
      <SectionPage id="appearance">
        <AppearanceCard />
      </SectionPage>
    );
  }

  if (!settings) {
    const loading = (
      <SettingsLoadingState isLoading={isLoading} onRetry={onRetry} />
    );
    return searching ? (
      loading
    ) : (
      <SectionPage id={activeSection}>{loading}</SectionPage>
    );
  }

  return (
    <div className="space-y-4">
      {shows("account") && (
        <SectionPage id="account">
          <AccountProfileCard
            name={settings.name}
            email={settings.email}
            memberSince={settings.memberSince}
          />
          <TimeZoneCard
            timeZone={settings.timeZone}
            options={settings.timeZoneOptions}
          />
          <DangerZoneCard />
        </SectionPage>
      )}
      {searching && (
        <SectionPage id="appearance">
          <AppearanceCard />
        </SectionPage>
      )}
      {shows("flashcards") && (
        <SectionPage id="flashcards">
          <FlashcardOptimizationCard settings={settings.fsrsOptimization} />
        </SectionPage>
      )}
    </div>
  );
}

function SectionPage({
  id,
  children,
}: Readonly<{ id: SettingsSectionId; children: ReactNode }>) {
  const section = settingsSections.find((entry) => entry.id === id);
  if (!section) return null;
  return (
    <SettingsPage title={section.label} description={section.description}>
      {children}
    </SettingsPage>
  );
}

function SettingsLoadingState({
  isLoading,
  onRetry,
}: Readonly<{ isLoading: boolean; onRetry: () => void }>) {
  return (
    <div
      role="status"
      className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      {isLoading ? (
        <>
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span className="sr-only">Loading settings…</span>
        </>
      ) : (
        <>
          <p>Couldn't load your settings.</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </>
      )}
    </div>
  );
}
