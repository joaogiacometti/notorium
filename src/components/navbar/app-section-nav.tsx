"use client";

import { CalendarDays, ClipboardList, FolderKanban } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sections = [
  {
    href: "/subjects",
    label: "Subjects",
    icon: FolderKanban,
  },
  {
    href: "/assessments",
    label: "Assessments",
    icon: ClipboardList,
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
  },
] as const;

export function AppSectionNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1 lg:hidden">
        {sections.map((section) => {
          const Icon = section.icon;
          const active =
            pathname === section.href ||
            pathname.startsWith(`${section.href}/`);

          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              aria-label={section.label}
              className={cn(
                "inline-flex items-center rounded-md p-1.5 transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
            </Link>
          );
        })}
      </div>

      <div className="hidden items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1 lg:flex">
        {sections.map((section) => {
          const Icon = section.icon;
          const active =
            pathname === section.href ||
            pathname.startsWith(`${section.href}/`);

          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {section.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
