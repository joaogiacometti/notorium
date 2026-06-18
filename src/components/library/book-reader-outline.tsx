"use client";

import {
  PdfActionType,
  type PdfBookmarkObject,
  type PdfLinkTarget,
} from "@embedpdf/models";
import { useBookmarkCapability } from "@embedpdf/plugin-bookmark/react";
import { useScroll } from "@embedpdf/plugin-scroll/react";
import { type ReactNode, useEffect, useState } from "react";
import { useReaderNavHistory } from "@/components/library/book-reader-nav-history";
import { useNavigateTarget } from "@/components/library/use-reader-navigate-target";
import { cn } from "@/lib/utils";

interface ReaderOutlineProps {
  documentId: string;
}

// PDF outline (table of contents). The bookmark plugin reads the document's
// embedded bookmark tree; clicking an entry jumps to its page instantly (no
// smooth-scroll animation) and records back-history like following a link.
export function ReaderOutline({ documentId }: Readonly<ReaderOutlineProps>) {
  const bookmarks = useDocumentBookmarks(documentId);
  const navigate = useOutlineNavigate(documentId);

  if (bookmarks === undefined) {
    return <OutlineMessage>Loading contents…</OutlineMessage>;
  }
  if (bookmarks.length === 0) {
    return <OutlineMessage>This book has no contents.</OutlineMessage>;
  }
  return (
    <nav aria-label="Table of contents" className="h-full overflow-y-auto p-2">
      <OutlineTree bookmarks={bookmarks} depth={0} onNavigate={navigate} />
    </nav>
  );
}

// Fetches the document's bookmarks once it (and the plugin) are ready;
// `undefined` means still loading, an empty array means none or a read failure.
function useDocumentBookmarks(
  documentId: string,
): PdfBookmarkObject[] | undefined {
  const { provides } = useBookmarkCapability();
  const [bookmarks, setBookmarks] = useState<PdfBookmarkObject[]>();

  useEffect(() => {
    if (!provides) return;
    let active = true;
    provides
      .forDocument(documentId)
      .getBookmarks()
      .wait(
        (result) => active && setBookmarks(result.bookmarks),
        () => active && setBookmarks([]),
      );
    return () => {
      active = false;
    };
  }, [provides, documentId]);

  return bookmarks;
}

// Outline jumps are instant: the annotation plugin's navigateTarget always
// smooth-scrolls, so for in-document destinations we scroll the page directly
// with behavior "instant" (recording back-history like a link), and fall back to
// the shared navigator only for external targets such as URIs.
function useOutlineNavigate(documentId: string) {
  const { provides: scroll } = useScroll(documentId);
  const history = useReaderNavHistory();
  const navigateTarget = useNavigateTarget(documentId);

  return (target: PdfLinkTarget | undefined) => {
    const pageIndex = destinationPageIndex(target);
    if (pageIndex === null) return navigateTarget(target);
    if (!scroll) return;
    history.recordCurrentView();
    scroll.scrollToPage({ pageNumber: pageIndex + 1, behavior: "instant" });
  };
}

// Resolves the 0-based page a target points at, or null when it is not an
// in-document jump (an external URI or an unsupported action).
function destinationPageIndex(
  target: PdfLinkTarget | undefined,
): number | null {
  if (!target) return null;
  if (target.type === "destination") return target.destination.pageIndex;
  const { action } = target;
  if (
    action.type === PdfActionType.Goto ||
    action.type === PdfActionType.RemoteGoto
  ) {
    return action.destination.pageIndex;
  }
  return null;
}

type NavigateTarget = (target: PdfLinkTarget | undefined) => void;

interface OutlineTreeProps {
  bookmarks: PdfBookmarkObject[];
  depth: number;
  onNavigate: NavigateTarget;
}

function OutlineTree({
  bookmarks,
  depth,
  onNavigate,
}: Readonly<OutlineTreeProps>) {
  return (
    <ul className={cn(depth > 0 && "ml-3 border-l border-border/50 pl-1")}>
      {bookmarks.map((bookmark, index) => (
        <OutlineEntry
          key={`${bookmark.title}-${index}`}
          bookmark={bookmark}
          depth={depth}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  );
}

interface OutlineEntryProps {
  bookmark: PdfBookmarkObject;
  depth: number;
  onNavigate: NavigateTarget;
}

function OutlineEntry({
  bookmark,
  depth,
  onNavigate,
}: Readonly<OutlineEntryProps>) {
  const children = bookmark.children ?? [];
  return (
    <li>
      <button
        type="button"
        onClick={() => onNavigate(bookmark.target)}
        disabled={!bookmark.target}
        className={cn(
          "w-full break-words rounded px-2 py-1 text-left text-sm text-muted-foreground transition-colors",
          "hover:bg-muted/60 hover:text-foreground",
          "disabled:cursor-default disabled:text-muted-foreground/70 disabled:hover:bg-transparent",
        )}
      >
        {bookmark.title}
      </button>
      {children.length > 0 && (
        <OutlineTree
          bookmarks={children}
          depth={depth + 1}
          onNavigate={onNavigate}
        />
      )}
    </li>
  );
}

function OutlineMessage({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="p-4 text-sm text-muted-foreground">{children}</p>;
}
