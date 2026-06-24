"use client";

import { useReaderAnnotations } from "@/components/library/book-reader-annotations";
import { useReaderShortcuts } from "@/components/library/use-reader-shortcuts";
import { useReaderSidebarCollapsed } from "@/components/library/use-reader-sidebar-collapsed";
import { useReaderZoom } from "@/components/library/use-reader-zoom";
import { useReadingPosition } from "@/components/library/use-reading-position";
import type { BookAnnotationDto } from "@/features/library-annotations/types";

interface UseReaderSessionOptions {
  documentId: string;
  bookId: string;
  initialPage: number;
  initialZoomMobile: string | null;
  initialZoomDesktop: string | null;
  initialAnnotations: BookAnnotationDto[];
}

/**
 * Wires persistence and keyboard shortcuts for an open reader document.
 *
 * @example
 * const session = useReaderSession({ documentId, bookId, initialPage, initialZoomMobile, initialZoomDesktop, initialAnnotations });
 */
export function useReaderSession({
  documentId,
  bookId,
  initialPage,
  initialZoomMobile,
  initialZoomDesktop,
  initialAnnotations,
}: Readonly<UseReaderSessionOptions>) {
  useReadingPosition({ documentId, bookId, initialPage });
  useReaderZoom({ documentId, bookId, initialZoomMobile, initialZoomDesktop });
  useReaderAnnotations({ documentId, bookId, initialAnnotations });
  const sidebar = useReaderSidebarCollapsed();
  useReaderShortcuts({
    documentId,
    onToggleSidebar: sidebar.toggle,
  });
  return sidebar;
}
