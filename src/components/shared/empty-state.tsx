import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional call-to-action rendered below the description (e.g. a Button). */
  action?: ReactNode;
  /** Layout overrides for the container (height/overflow per context). */
  className?: string;
}

/**
 * Full-page empty state: a dashed surface with a primary icon medallion, a
 * title, a muted description, and an optional action. Centralizes the
 * empty-state tokens (see `docs/ui-conventions.md`) so every "Nothing here yet"
 * surface reads identically; callers pass only context-specific layout via
 * `className`.
 *
 * @example
 * <EmptyState
 *   icon={BookOpen}
 *   title="No subjects yet"
 *   description="Create your first subject to start organizing your notes."
 *   action={<Button onClick={openCreate}>Create Subject</Button>}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-20 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-6" />
      </div>
      <h2 className="mb-1 text-lg font-semibold">{title}</h2>
      <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
        {description}
      </p>
      {action}
    </div>
  );
}
