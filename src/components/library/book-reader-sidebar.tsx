"use client";

import { useState } from "react";
import { ReaderHighlights } from "@/components/library/book-reader-highlights";
import { ReaderOutline } from "@/components/library/book-reader-outline";
import { ReaderThumbnails } from "@/components/library/book-reader-thumbnails";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BookAnnotationDto } from "@/features/library-annotations/types";

type SidebarView = "pages" | "content" | "highlights";

const SIDEBAR_TAB_TRIGGER_CLASS = "grow-0 basis-auto px-2 text-xs";

interface ReaderSidebarProps {
  documentId: string;
  initialAnnotations: BookAnnotationDto[];
  isCollapsed: boolean;
  readerColorInverted: boolean;
}

// Left rail with a Pages/Content/Highlights switch: "Pages" shows the
// virtualized page thumbnails, "Content" shows the PDF outline (table of
// contents), and "Highlights" shows the user's saved reader highlights. Only
// the active panel mounts, so switching views tears down hidden virtualizers
// and plugin subscribers instead of leaving them measuring a hidden box.
// Hidden on small screens, matching the thumbnail rail's prior behavior.
// Collapsing hides the rail entirely; the toolbar button expands it again.
export function ReaderSidebar({
  documentId,
  initialAnnotations,
  isCollapsed,
  readerColorInverted,
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
        <TabsList className="flex w-full justify-between">
          <TabsTrigger className={SIDEBAR_TAB_TRIGGER_CLASS} value="pages">
            Pages
          </TabsTrigger>
          <TabsTrigger className={SIDEBAR_TAB_TRIGGER_CLASS} value="content">
            Content
          </TabsTrigger>
          <TabsTrigger className={SIDEBAR_TAB_TRIGGER_CLASS} value="highlights">
            Highlights
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="min-h-0 flex-1">
        {view === "pages" && (
          <ReaderThumbnails
            documentId={documentId}
            readerColorInverted={readerColorInverted}
          />
        )}
        {view === "content" && <ReaderOutline documentId={documentId} />}
        {view === "highlights" && (
          <ReaderHighlights
            documentId={documentId}
            initialAnnotations={initialAnnotations}
          />
        )}
      </div>
    </aside>
  );
}
