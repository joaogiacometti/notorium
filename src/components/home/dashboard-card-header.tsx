import type { ReactNode } from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardCardHeaderProps {
  title: string;
  /** Optional trailing metadata or control, right-aligned. */
  action?: ReactNode;
}

/**
 * Shared header for the Home dashboard overview cards: a quiet `text-sm` title
 * and an optional right-aligned action, identical on every card.
 *
 * @example
 * <DashboardCardHeader title="Recent documents" />
 */
export function DashboardCardHeader({
  title,
  action,
}: Readonly<DashboardCardHeaderProps>) {
  return (
    <CardHeader className="flex min-h-5 flex-row items-center gap-2 space-y-0">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {action ? <div className="ml-auto">{action}</div> : null}
    </CardHeader>
  );
}
