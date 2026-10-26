import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  titleTestId?: string;
  /** Muted line under the title. */
  description?: string;
  /** Right-aligned header actions, usually `size-10` ghost icon buttons. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  titleTestId,
  description,
  actions,
  className,
}: Readonly<PageHeaderProps>) {
  return (
    <header className={cn("mb-4 flex items-start gap-4", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1
          data-testid={titleTestId}
          className="text-xl font-semibold tracking-tight"
        >
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
