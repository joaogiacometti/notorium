"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface AccountSectionNavItem {
  id: string;
  label: string;
  tone?: "default" | "danger";
}

interface AccountSectionsNavProps {
  items: readonly AccountSectionNavItem[];
  className?: string;
}

export function AccountSectionsNav({
  items,
  className,
}: Readonly<AccountSectionsNavProps>) {
  const fallbackId = items[0]?.id ?? "";
  const [activeId, setActiveId] = useState(fallbackId);

  useEffect(() => {
    const itemIds = items.map((item) => item.id);

    const syncFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash && itemIds.includes(hash)) {
        setActiveId(hash);
        return;
      }
      setActiveId(fallbackId);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [fallbackId, items]);

  return (
    <nav
      aria-label="Account settings sections"
      className={cn(
        "rounded-xl border border-border/60 bg-card/80 p-3 backdrop-blur-sm",
        className,
      )}
    >
      <p className="px-2 pb-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Settings
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = activeId === item.id;
          const danger = item.tone === "danger";

          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setActiveId(item.id)}
              aria-current={active ? "location" : undefined}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                active && !danger && "bg-muted/70 text-foreground",
                !active &&
                  !danger &&
                  "text-muted-foreground hover:text-foreground",
                active &&
                  danger &&
                  "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]",
                !active &&
                  danger &&
                  "text-[var(--status-danger-text)]/85 hover:text-[var(--status-danger-text)]",
              )}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full bg-muted-foreground/70",
                  active && !danger && "bg-primary",
                  danger && "bg-[var(--status-danger-fill)]",
                )}
              />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
