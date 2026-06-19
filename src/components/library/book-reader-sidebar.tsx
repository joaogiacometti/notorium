"use client";

import { useState } from "react";
import { ReaderOutline } from "@/components/library/book-reader-outline";
import { ReaderThumbnails } from "@/components/library/book-reader-thumbnails";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SidebarView = "pages" | "content";

interface ReaderSidebarProps {
  documentId: string;
  isCollapsed: boolean;
}

// Left rail with a Pages/Content switch: "Pages" shows the virtualized page
// thumbnails, "Content" shows the PDF outline (table of contents). Only the
// active panel mounts, so switching to Content tears down the thumbnail
// virtualizer instead of leaving it measuring a hidden box. Hidden on small
// screens, matching the thumbnail rail's prior behavior. Collapsing hides the
// rail entirely; the toolbar button expands it again.
export function ReaderSidebar({
  documentId,
  isCollapsed,
}: Readonly<ReaderSidebarProps>) {
  const [view, setView] = useState<SidebarView>("pages");

  if (isCollapsed) return null;

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border/70 bg-background md:flex">
      <Tabs
        value={view}
        onValueChange={(value) => setView(value as SidebarView)}
        className="shrink-0 p-2"
      >
        <TabsList className="w-full">
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="min-h-0 flex-1">
        {view === "pages" ? (
          <ReaderThumbnails documentId={documentId} />
        ) : (
          <ReaderOutline documentId={documentId} />
        )}
      </div>
    </aside>
  );
}
