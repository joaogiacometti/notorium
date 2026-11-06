"use client";

import { FolderTreeSidebar } from "@/components/folders/tree/folder-tree-sidebar";
import { AccountMenu } from "@/components/navbar/account-menu";
import { AppSidebarNav } from "@/components/navbar/app-sidebar-nav";
import { SidebarCollapseToggle } from "@/components/shared/sidebar-collapse-toggle";
import type { FolderTreeNode } from "@/lib/server/api-contracts";

interface AppSidebarProps {
  tree: FolderTreeNode[];
  accountName: string;
  email: string;
  isAdmin: boolean;
  onOpenSearch: () => void;
}

/**
 * The full left menu: the account button at the top (aligned with the page top
 * bar), then Search and the global section links, then the scrollable folder
 * tree filling the remaining height. The collapse toggle sits at the top-right
 * of the sidebar (RemNote style).
 */
export function AppSidebar({
  tree,
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
        <FolderTreeSidebar tree={tree} />
      </div>
    </div>
  );
}
