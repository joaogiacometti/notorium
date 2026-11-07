import type { ReactNode } from "react";
import { AppPageContainer } from "@/components/shared/app-page-container";
import {
  type BreadcrumbIcon,
  PageTopBar,
} from "@/components/shared/page-top-bar";

interface FeaturePageShellProps {
  children: ReactNode;
  icon: BreadcrumbIcon;
  switcher?: ReactNode;
  title: string;
}

export function FeaturePageShell({
  children,
  icon,
  switcher,
  title,
}: Readonly<FeaturePageShellProps>) {
  return (
    <>
      <PageTopBar breadcrumb={{ current: { label: title, icon } }} />
      <main className="lg:h-[calc(100svh-3.5rem)] lg:overflow-hidden">
        <AppPageContainer className="flex flex-col lg:h-full lg:min-h-0">
          {switcher ? <div className="mb-4">{switcher}</div> : null}

          <div className="lg:min-h-0 lg:flex-1">{children}</div>
        </AppPageContainer>
      </main>
    </>
  );
}
