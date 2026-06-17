import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Home,
  Layers,
  Layers3,
  Library,
  type LucideIcon,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * String identifiers for breadcrumb icons so Server Components can pass them
 * across the Client Component boundary without serializing Lucide functions.
 */
export type BreadcrumbIcon =
  | "book-open"
  | "calendar-days"
  | "home"
  | "layers"
  | "layers-3"
  | "library"
  | "shield";

const breadcrumbIconMap: Record<BreadcrumbIcon, LucideIcon> = {
  "book-open": BookOpen,
  "calendar-days": CalendarDays,
  home: Home,
  layers: Layers,
  "layers-3": Layers3,
  library: Library,
  shield: Shield,
};

export interface BreadcrumbItem {
  label: string;
  /** When set, the crumb links here. The current (last) crumb is unlinked. */
  href?: string;
  icon?: BreadcrumbIcon;
}

interface PageTopBarProps {
  breadcrumb: BreadcrumbItem[];
  /** Optional right-aligned controls (e.g. document actions). */
  actions?: ReactNode;
}

/**
 * Sticky location bar at the top of a page's content area. It shows a Notion
 * style breadcrumb trail (the user's "where am I" indicator) and replaces the
 * former per-page "Back to …" links. The 3.5rem height matches the layout's
 * `calc(100svh-3.5rem)` content-height assumptions.
 *
 * @example
 * <PageTopBar
 *   breadcrumb={[
 *     { label: "Physics", href: "/subjects/abc", icon: "book-open" },
 *     { label: "Lecture 3", href: "/subjects/abc/documents/notes/n1" },
 *     { label: "Edit" },
 *   ]}
 * />
 */
export function PageTopBar({ breadcrumb, actions }: Readonly<PageTopBarProps>) {
  return (
    <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur sm:px-6">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-1 pl-1 text-sm"
      >
        {breadcrumb.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
            ) : null}
            <BreadcrumbCrumb
              item={item}
              isCurrent={index === breadcrumb.length - 1}
            />
          </Fragment>
        ))}
      </nav>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/**
 * Loading placeholder that mirrors {@link PageTopBar}'s height and border so
 * `loading.tsx` skeletons keep the same top bar and avoid layout shift.
 */
export function PageTopBarSkeleton() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-4 sm:px-6">
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

interface BreadcrumbCrumbProps {
  item: BreadcrumbItem;
  isCurrent: boolean;
}

function BreadcrumbCrumb({ item, isCurrent }: Readonly<BreadcrumbCrumbProps>) {
  const Icon = item.icon ? breadcrumbIconMap[item.icon] : null;
  const content = (
    <>
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      <span className="truncate">{item.label}</span>
    </>
  );

  if (isCurrent || !item.href) {
    return (
      <span
        aria-current={isCurrent ? "page" : undefined}
        className={cn(
          "flex min-w-0 items-center gap-1.5",
          isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className="flex min-w-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
    >
      {content}
    </Link>
  );
}
