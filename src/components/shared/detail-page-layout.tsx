import type { ReactNode } from "react";
import {
  AppPageContainer,
  type AppPageContainerMaxWidth,
} from "@/components/shared/app-page-container";
import {
  type BreadcrumbItem,
  PageTopBar,
} from "@/components/shared/page-top-bar";

interface DetailPageLayoutProps {
  breadcrumb: BreadcrumbItem[];
  children: ReactNode;
  /** Optional right-aligned controls rendered in the sticky top bar. */
  actions?: ReactNode;
  className?: string;
  /** Centered content width. Detail pages default to `5xl` (see architecture docs). */
  maxWidth?: AppPageContainerMaxWidth;
}

/**
 * Canonical wrapper for card/detail pages: a sticky {@link PageTopBar}
 * breadcrumb above an {@link AppPageContainer}-centered body. Extracting this
 * keeps every detail surface (assessment, subject, flashcard, admin) structured
 * the same way instead of each repeating the `PageTopBar + AppPageContainer`
 * fragment.
 *
 * @example
 * <DetailPageLayout
 *   breadcrumb={[{ label: "Flashcards", href: "/flashcards", icon: "layers" }]}
 *   maxWidth="3xl"
 * >
 *   <FlashcardEditor />
 * </DetailPageLayout>
 */
export function DetailPageLayout({
  breadcrumb,
  children,
  actions,
  className,
  maxWidth = "5xl",
}: Readonly<DetailPageLayoutProps>) {
  return (
    <>
      <PageTopBar breadcrumb={breadcrumb} actions={actions} />
      <AppPageContainer maxWidth={maxWidth} className={className}>
        {children}
      </AppPageContainer>
    </>
  );
}
