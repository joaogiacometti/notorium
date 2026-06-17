"use client";

import { createContext, type ReactNode, useContext } from "react";
import { cn } from "@/lib/utils";

/**
 * Active settings search query (already lowercased), shared so sections and
 * rows can self-filter. Empty string means "not searching" — show everything.
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

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

/**
 * Flat (RemNote-style) settings group: a section heading above a list of rows
 * separated by dividers. While a search is active the heading is hidden so
 * matching rows from every section read as one flat list.
 *
 * @example
 * <SettingsSection title="Notifications">
 *   <SettingsRow label="Email reminders" action={<Switch />} />
 * </SettingsSection>
 */
export function SettingsSection({
  title,
  children,
}: Readonly<SettingsSectionProps>) {
  const query = useSettingsSearch();
  return (
    <section>
      {query ? null : (
        <h2 className="mb-2 text-xl font-semibold tracking-tight">{title}</h2>
      )}
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}

interface SettingsRowProps {
  label: string;
  description?: ReactNode;
  /** Extra terms (space-separated) the search should match this row on. */
  keywords?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * One settings row: label and optional sub-text on the left, an action control
 * on the right. Full-width controls (inputs, grids) go in `children`. The row
 * removes itself when a search is active and neither its label nor keywords
 * match the query.
 *
 * @example
 * <SettingsRow label="Email" description="ada@example.com" keywords="address" />
 */
export function SettingsRow({
  label,
  description,
  keywords,
  action,
  children,
  className,
}: Readonly<SettingsRowProps>) {
  const query = useSettingsSearch();
  if (query && !`${label} ${keywords ?? ""}`.toLowerCase().includes(query)) {
    return null;
  }

  return (
    <div className={cn("py-4 first:pt-0 last:pb-0", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium">{label}</p>
          {description ? (
            <div className="text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
