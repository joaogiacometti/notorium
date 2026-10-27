"use client";

import { Home, Layers, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AssistantAppFrame } from "@/components/assistant/assistant-app-frame";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { StudyAssistant } from "@/components/assistant/study-assistant";
import { AppSidebar } from "@/components/navbar/app-sidebar";
import { GlobalSearch } from "@/components/navbar/global-search";
import { MobileSidebarSheet } from "@/components/shared/mobile-sidebar-sheet";
import { SidebarCollapseProvider } from "@/components/shared/sidebar-collapse-context";
import { SidebarCollapseToggle } from "@/components/shared/sidebar-collapse-toggle";
import { useSidebarCollapsed } from "@/components/shared/use-sidebar-collapsed";
import type { TutoringMode } from "@/features/assistant/validation";
import { isFlashcardSessionPath } from "@/lib/navigation/detail-page-back-link";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";
import { isEditableTarget } from "@/lib/shortcuts/registry";
import { cn } from "@/lib/utils";

interface AppLayoutClientProps {
  tree: SubjectTreeNode[] | null;
  accountName: string;
  email: string;
  isAdmin: boolean;
  userId: string;
  aiEnabled: boolean;
  initialSidebarCollapsed: boolean;
  initialTutoring: TutoringMode;
  children: React.ReactNode;
}

const collapsedLinks = [
  // Home matches `/` exactly so it doesn't stay active on every nested route.
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
] as const;

/**
 * Collapsed sidebar icon rail shown when the sidebar is collapsed.
 * Displays the expand toggle plus icon-only nav links (RemNote style).
 */
function CollapsedSidebar({
  onOpenSearch,
}: Readonly<{
  onOpenSearch: () => void;
}>) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-12 shrink-0 border-r lg:block">
      <div className="sticky top-0 flex h-svh flex-col items-center gap-0.5 pt-3">
        <SidebarCollapseToggle />

        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <Search className="size-4" />
        </button>

        {collapsedLinks.map((link) => {
          const exact = "exact" in link ? link.exact : false;
          const active = exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-label={link.label}
              className={cn(
                "flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                active && "bg-muted text-foreground",
              )}
            >
              <Icon className="size-4" />
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

export function AppLayoutClient({
  tree,
  accountName,
  email,
  isAdmin,
  userId,
  aiEnabled,
  initialSidebarCollapsed,
  initialTutoring,
  children,
}: Readonly<AppLayoutClientProps>) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const { collapsed, setCollapsed } = useSidebarCollapsed(
    initialSidebarCollapsed,
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "b") return;
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.altKey || e.shiftKey) return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      setCollapsed(!collapsed);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [collapsed, setCollapsed]);

  // Review and exam sessions are distraction-free pages without the sidebar.
  const showSidebar = tree != null && !isFlashcardSessionPath(pathname);

  // The sidebar mounts twice (mobile sheet + desktop aside), so the keyboard
  // dialogs live here in the shell to keep a single listener and dialog.
  const sidebar = tree ? (
    <AppSidebar
      tree={tree}
      aiEnabled={aiEnabled}
      accountName={accountName}
      email={email}
      isAdmin={isAdmin}
      onOpenSearch={() => setSearchOpen(true)}
    />
  ) : null;

  // When the sidebar is collapsed, a thin strip with the expand toggle
  // remains visible (RemNote style) instead of disappearing entirely.
  const mainRow = showSidebar ? (
    <SidebarCollapseProvider value={{ collapsed, setCollapsed }}>
      <div className="flex min-h-svh">
        {collapsed ? (
          <CollapsedSidebar onOpenSearch={() => setSearchOpen(true)} />
        ) : (
          <aside className="hidden w-72 shrink-0 border-r lg:block">
            <div className="sticky top-0 flex h-svh flex-col px-2 pb-3">
              {sidebar}
            </div>
          </aside>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </SidebarCollapseProvider>
  ) : (
    <div className="flex min-h-svh">
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );

  const content = (
    <div className="min-h-svh bg-background">
      {userId && (
        <GlobalSearch
          userId={userId}
          aiEnabled={aiEnabled}
          open={searchOpen}
          onOpenChange={setSearchOpen}
        />
      )}
      {showSidebar ? <MobileSidebarSheet>{sidebar}</MobileSidebarSheet> : null}
      {mainRow}
      {userId && aiEnabled ? <StudyAssistant /> : null}
    </div>
  );
  return userId && aiEnabled ? (
    <AssistantWorkspaceProvider initialTutoring={initialTutoring}>
      <AssistantAppFrame>{content}</AssistantAppFrame>
    </AssistantWorkspaceProvider>
  ) : (
    content
  );
}
