"use client";

import { createContext, type ReactNode, useContext } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Active settings search query (already lowercased), shared so pages and cards
 * can self-filter. Empty string means "not searching" — show everything.
 */
const SettingsSearchContext = createContext("");

export function SettingsSearchProvider({
  query,
  children,
}: Readonly<{ query: string; children: ReactNode }>) {
  return (
    <SettingsSearchContext.Provider value={query.trim().toLowerCase()}>
      {children}
    </SettingsSearchContext.Provider>
  );
}

function useSettingsSearch() {
  return useContext(SettingsSearchContext);
}

interface SettingsPageProps {
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * One settings section: a page title and description above its cards. While a
 * search is active the header hides so matching cards read as one list.
 *
 * @example
 * <SettingsPage title="Appearance" description="Choose how Notorium looks.">
 *   <SettingsCard title="Theme">…</SettingsCard>
 * </SettingsPage>
 */
export function SettingsPage({
  title,
  description,
  children,
}: Readonly<SettingsPageProps>) {
  const query = useSettingsSearch();
  return (
    <section className="space-y-4">
      {query ? null : (
        <header className="hidden space-y-1 sm:block">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </header>
      )}
      {children}
    </section>
  );
}

interface SettingsCardProps {
  title: string;
  /** What the setting does, or metadata for an identity card. */
  description: ReactNode;
  /** Leading visual for the header, such as an avatar. */
  media?: ReactNode;
  /** Extra terms (space-separated) the search should match this card on. */
  keywords?: string;
  /** The card's control or actions, aligned with the title. */
  control?: ReactNode;
  tone?: "default" | "danger";
  children?: ReactNode;
}

/**
 * One group of settings with a fixed anatomy: a header (title, description,
 * and one control or action group on the right) and an optional body for
 * richer content. The card removes itself when a search is active and neither
 * its title nor keywords match the query.
 *
 * @example
 * <SettingsCard title="Time zone" description="…" control={<Picker />} />
 */
export function SettingsCard({
  title,
  description,
  media,
  keywords,
  control,
  tone = "default",
  children,
}: Readonly<SettingsCardProps>) {
  const query = useSettingsSearch();
  if (query && !`${title} ${keywords ?? ""}`.toLowerCase().includes(query)) {
    return null;
  }

  return (
    <Card
      data-slot="settings-card"
      className={cn(
        "gap-0 p-4 shadow-none sm:p-5",
        tone === "danger" && "border-destructive/45",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-[1_1_14rem] items-center gap-3">
          {media}
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-base font-semibold tracking-tight">
              {title}
            </h3>
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
        </div>
        {control ? (
          <div className="flex flex-wrap items-center gap-2">{control}</div>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </Card>
  );
}
