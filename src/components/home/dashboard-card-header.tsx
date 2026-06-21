import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardCardHeaderProps {
  icon: LucideIcon;
  title: string;
  /** Optional trailing control (e.g. a create button), right-aligned. */
  action?: ReactNode;
}

/**
 * Shared header for the Home dashboard overview cards: a leading muted domain
 * icon, a `text-base` title, and an optional right-aligned action. Keeps every
 * dashboard card's header identical instead of some carrying a leading icon and
 * others not.
 *
 * @example
 * <DashboardCardHeader icon={Layers} title="Flashcards due" />
 */
export function DashboardCardHeader({
  icon: Icon,
  title,
  action,
}: Readonly<DashboardCardHeaderProps>) {
  return (
    <CardHeader className="flex flex-row items-center gap-2 space-y-0">
      <Icon className="size-4 text-muted-foreground" />
      <CardTitle className="text-base">{title}</CardTitle>
      {action ? <div className="ml-auto">{action}</div> : null}
    </CardHeader>
  );
}
