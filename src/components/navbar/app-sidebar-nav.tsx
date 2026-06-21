"use client";

import { CalendarDays, Home, Layers, Search } from "lucide-react";
import {
  SidebarNavLink,
  sidebarRowClassName,
} from "@/components/navbar/sidebar-nav-row";

const sections = [
  // Home matches `/` exactly so it doesn't stay active on every nested route.
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
] as const;

interface AppSidebarNavProps {
  onOpenSearch: () => void;
}

/**
 * Left-menu list: the search trigger and the global section links grouped as
 * one tight list. Subjects are the tree rendered below this.
 */
export function AppSidebarNav({ onOpenSearch }: Readonly<AppSidebarNavProps>) {
  return (
    <nav aria-label="Sections" className="space-y-0.5 px-1">
      <button
        type="button"
        onClick={onOpenSearch}
        className={sidebarRowClassName(false)}
      >
        <Search className="size-4 shrink-0" />
        Search
      </button>
      {sections.map((section) => (
        <SidebarNavLink
          key={section.href}
          href={section.href}
          label={section.label}
          icon={section.icon}
          exact={"exact" in section ? section.exact : false}
        />
      ))}
    </nav>
  );
}
