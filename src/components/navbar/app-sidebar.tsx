"use client";

import { AccountMenu } from "@/components/navbar/account-menu";
import { AppSidebarNav } from "@/components/navbar/app-sidebar-nav";
import { SidebarCollapseToggle } from "@/components/shared/sidebar-collapse-toggle";
import { SubjectTreeSidebar } from "@/components/subjects/tree/subject-tree-sidebar";
import type {
  SubjectOption,
  SubjectTreeNode,
} from "@/lib/server/api-contracts";

interface AppSidebarProps {
  tree: SubjectTreeNode[];
  subjects: SubjectOption[];
  aiEnabled: boolean;
  accountName: string;
  email: string;
  isAdmin: boolean;
  onOpenSearch: () => void;
}

/**
 * The full left menu: the account button at the top (aligned with the page top
 * bar), then Search and the global section links, then the scrollable subject
 * tree filling the remaining height. The collapse toggle sits at the top-right
 * of the sidebar (RemNote style).
 */
export function AppSidebar({
  tree,
  subjects,
  aiEnabled,
  accountName,
  email,
  isAdmin,
  onOpenSearch,
}: Readonly<AppSidebarProps>) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center px-1">
        <AccountMenu
          accountName={accountName}
          email={email}
          isAdmin={isAdmin}
          variant="sidebar"
        />
        <div className="ml-auto">
          <SidebarCollapseToggle />
        </div>
      </div>

      <AppSidebarNav onOpenSearch={onOpenSearch} />

      <div className="mt-3 min-h-0 flex-1">
        <SubjectTreeSidebar
          tree={tree}
          subjects={subjects}
          aiEnabled={aiEnabled}
        />
      </div>
    </div>
  );
}
