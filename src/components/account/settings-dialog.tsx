"use client";

import { Loader2, Search, X } from "lucide-react";
import { useState } from "react";
import { AccountProfileCard } from "@/components/account/account-profile-card";
import { AppearanceCard } from "@/components/account/appearance-card";
import { DangerZoneCard } from "@/components/account/danger-zone-card";
import { FlashcardOptimizationCard } from "@/components/account/flashcard-optimization-card";
import { NotificationPreferencesCard } from "@/components/account/notification-preferences-card";
import { SettingsSearchProvider } from "@/components/account/settings-section";
import {
  type SettingsSection,
  type SettingsSectionId,
  settingsSections,
} from "@/components/account/settings-sections";
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
}

/**
 * RemNote/Notion-style settings overlay: a sidebar (search + section list) on
 * the left and either the active section or cross-section search results on the
 * right. Replaces the former `/account` page.
 *
 * @example
 * <SettingsDialog open={open} onOpenChange={setOpen} activeSection="account"
 *   onSelectSection={setSection} settings={data} isLoading={isPending} />
 */
export function SettingsDialog({
  open,
  onOpenChange,
  activeSection,
  onSelectSection,
  settings,
  isLoading,
}: Readonly<SettingsDialogProps>) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const emailEnabled = settings?.emailEnabled ?? false;
  const visibleSections = settingsSections.filter(
    (section) => section.id !== "notifications" || !settings || emailEnabled,
  );
  // A deep link can request notifications before we know email is off; once
  // loaded, fall back to Account so we never render a hidden section.
  const effectiveSection =
    settings && !visibleSections.some((section) => section.id === activeSection)
      ? "account"
      : activeSection;

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
      <DialogContent className="flex h-[80vh] max-h-[40rem] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl sm:flex-row">
        <SettingsSidebar
          sections={visibleSections}
          activeSection={effectiveSection}
          onSelectSection={handleSelectSection}
          query={query}
          onQueryChange={setQuery}
        />
        <div className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <DialogDescription className="sr-only">
            Manage your account, appearance, notifications, and flashcard
            settings.
          </DialogDescription>
          <SettingsSearchProvider query={query}>
            {searching ? (
              <SearchResults
                query={query}
                settings={settings}
                isLoading={isLoading}
                emailEnabled={emailEnabled}
              />
            ) : (
              <SettingsSectionContent
                activeSection={effectiveSection}
                settings={settings}
                isLoading={isLoading}
              />
            )}
          </SettingsSearchProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SettingsSidebarProps {
  sections: SettingsSection[];
  activeSection: SettingsSectionId;
  onSelectSection: (section: SettingsSectionId) => void;
  query: string;
  onQueryChange: (query: string) => void;
}

function SettingsSidebar({
  sections,
  activeSection,
  onSelectSection,
  query,
  onQueryChange,
}: Readonly<SettingsSidebarProps>) {
  const searching = query.trim().length > 0;
  return (
    <nav className="shrink-0 border-b border-border/60 bg-muted/20 p-2 sm:w-48 sm:border-r sm:border-b-0 sm:p-3">
      <DialogTitle className="px-2 pb-2 text-base font-semibold">
        Settings
      </DialogTitle>
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
        <div className="mt-2 flex gap-1 overflow-x-auto sm:flex-col sm:gap-0.5 sm:overflow-visible">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = section.id === activeSection;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground",
                  active && "bg-accent/65 text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {section.label}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}

interface SearchResultsProps {
  query: string;
  settings: AccountSettings | undefined;
  isLoading: boolean;
  emailEnabled: boolean;
}

function SearchResults({
  query,
  settings,
  isLoading,
  emailEnabled,
}: Readonly<SearchResultsProps>) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold tracking-tight">
        {`"${query.trim()}"`}
      </h2>
      {settings ? (
        <AllSettings settings={settings} emailEnabled={emailEnabled} />
      ) : (
        <SettingsLoadingState isLoading={isLoading} />
      )}
    </div>
  );
}

/**
 * Every section rendered at once so each row can self-filter against the active
 * search query. Section titles hide themselves while searching.
 */
function AllSettings({
  settings,
  emailEnabled,
}: Readonly<{ settings: AccountSettings; emailEnabled: boolean }>) {
  return (
    <>
      <AccountProfileCard
        name={settings.name}
        email={settings.email}
        createdAt={settings.createdAt}
      />
      <AppearanceCard />
      {emailEnabled ? (
        <NotificationPreferencesCard
          initialEnabled={settings.notificationsEnabled}
          initialDaysBefore={settings.notificationDaysBefore}
        />
      ) : null}
      <FlashcardOptimizationCard
        settings={settings.fsrsOptimization}
        workflowsEnabled={settings.workflowsEnabled}
      />
      <DangerZoneCard />
    </>
  );
}

interface SettingsSectionContentProps {
  activeSection: SettingsSectionId;
  settings: AccountSettings | undefined;
  isLoading: boolean;
}

function SettingsSectionContent({
  activeSection,
  settings,
  isLoading,
}: Readonly<SettingsSectionContentProps>) {
  if (activeSection === "appearance") {
    return <AppearanceCard />;
  }

  if (!settings) {
    return <SettingsLoadingState isLoading={isLoading} />;
  }

  return <LoadedSection activeSection={activeSection} settings={settings} />;
}

function LoadedSection({
  activeSection,
  settings,
}: Readonly<{ activeSection: SettingsSectionId; settings: AccountSettings }>) {
  if (activeSection === "notifications") {
    return (
      <NotificationPreferencesCard
        initialEnabled={settings.notificationsEnabled}
        initialDaysBefore={settings.notificationDaysBefore}
      />
    );
  }

  if (activeSection === "flashcards") {
    return (
      <FlashcardOptimizationCard
        settings={settings.fsrsOptimization}
        workflowsEnabled={settings.workflowsEnabled}
      />
    );
  }

  return (
    <div className="space-y-8">
      <AccountProfileCard
        name={settings.name}
        email={settings.email}
        createdAt={settings.createdAt}
      />
      <DangerZoneCard />
    </div>
  );
}

function SettingsLoadingState({ isLoading }: Readonly<{ isLoading: boolean }>) {
  return (
    <div className="flex h-40 items-center justify-center text-muted-foreground">
      {isLoading ? (
        <Loader2 className="size-5 animate-spin" />
      ) : (
        <p className="text-sm">Could not load your settings. Try reopening.</p>
      )}
    </div>
  );
}
