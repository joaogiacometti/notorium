import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { Button } from "@/components/ui/button";

interface DetailPageLayoutProps {
  actions?: ReactNode;
  backHref: string;
  backIcon: LucideIcon;
  backLabel: string;
  children: ReactNode;
  description?: ReactNode;
  maxWidth?: "3xl" | "4xl" | "5xl";
  meta?: ReactNode;
  title: ReactNode;
  titleIcon: LucideIcon;
}

export function DetailPageLayout({
  actions,
  backHref,
  backIcon: BackIcon,
  backLabel,
  children,
  description,
  maxWidth = "3xl",
  meta,
  title,
  titleIcon: TitleIcon,
}: Readonly<DetailPageLayoutProps>) {
  return (
    <AppPageContainer maxWidth={maxWidth}>
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={backHref}>
            <BackIcon className="size-4" />
            {backLabel}
          </Link>
        </Button>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TitleIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              {title}
            </h1>
            {description ? (
              <div className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
                {description}
              </div>
            ) : null}
            {meta ? (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
                {meta}
              </div>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">{actions}</div>
        ) : null}
      </div>

      {children}
    </AppPageContainer>
  );
}
