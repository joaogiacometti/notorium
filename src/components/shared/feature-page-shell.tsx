import type { ReactNode } from "react";
import { AppPageContainer } from "@/components/shared/app-page-container";
import {
  type BreadcrumbIcon,
  PageTopBar,
} from "@/components/shared/page-top-bar";

interface FeaturePageShellProps {
  children: ReactNode;
  icon: BreadcrumbIcon;
  isolateContentScroll?: boolean;
  switcher?: ReactNode;
  title: string;
}

export function FeaturePageShell({
  children,
  icon,
  isolateContentScroll = false,
  switcher,
  title,
}: Readonly<FeaturePageShellProps>) {
  return (
    <>
      <PageTopBar breadcrumb={[{ label: title, icon }]} />
      <main className="lg:h-[calc(100svh-3.5rem)] lg:overflow-hidden">
        <AppPageContainer className="flex flex-col lg:h-full lg:min-h-0">
          {switcher ? <div className="mb-4">{switcher}</div> : null}

          <div
            className={
              isolateContentScroll
                ? "lg:min-h-0 lg:flex-1"
                : "lg:flex-1 lg:min-h-0"
            }
          >
            {children}
          </div>
        </AppPageContainer>
      </main>
    </>
  );
}
