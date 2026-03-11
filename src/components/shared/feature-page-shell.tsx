import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AppPageContainer } from "@/components/shared/app-page-container";

interface FeaturePageShellProps {
  children: ReactNode;
  description: string;
  headerMeta?: string;
  icon: LucideIcon;
  switcher?: ReactNode;
  title: string;
}

export function FeaturePageShell({
  children,
  description,
  headerMeta,
  icon: Icon,
  switcher,
  title,
}: Readonly<FeaturePageShellProps>) {
  return (
    <main className="lg:h-[calc(100svh-3.5rem)] lg:overflow-hidden">
      <AppPageContainer className="flex flex-col lg:h-full lg:min-h-0">
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              {description}
            </p>
            {headerMeta ? (
              <p className="mt-2 text-sm font-medium text-foreground">
                {headerMeta}
              </p>
            ) : null}
          </div>
        </div>

        {switcher ? <div className="mb-6">{switcher}</div> : null}

        <div className="lg:flex-1 lg:min-h-0">{children}</div>
      </AppPageContainer>
    </main>
  );
}
