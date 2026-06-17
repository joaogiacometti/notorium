"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Shared row styling for the left menu so links and the search button stay
 * visually consistent (Home, Planning/Flashcards/Library, Search).
 */
export function sidebarRowClassName(active: boolean): string {
  return cn(
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
    active
      ? "bg-muted/60 text-foreground"
      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
  );
}

interface SidebarNavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match the path exactly instead of treating descendants as active. */
  exact?: boolean;
}

/**
 * Active-aware navigation link for the left menu.
 *
 * @example
 * <SidebarNavLink href="/planning" label="Planning" icon={CalendarDays} />
 */
export function SidebarNavLink({
  href,
  label,
  icon: Icon,
  exact = false,
}: Readonly<SidebarNavLinkProps>) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={sidebarRowClassName(active)}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}
