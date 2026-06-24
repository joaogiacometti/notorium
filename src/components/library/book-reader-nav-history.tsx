"use client";

import { useScroll } from "@embedpdf/plugin-scroll/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from "react";

// Lightweight "go back to where I was" stack for the reader, the way desktop PDF
// viewers let you return to your spot after following an internal link. We snap
// the current view (top-most visible page plus the page-space point at the
// viewport top) onto a stack right before a link jump, then restore it exactly.

interface SavedView {
  pageNumber: number;
  x: number;
  y: number;
}

interface ReaderNavHistory {
  /** True when there is at least one recorded view to return to. */
  canGoBack: boolean;
  /** Snapshot the current view; call right before following a link. */
  recordCurrentView: () => void;
  /** Drop the most recent snapshot without moving (e.g. an external URI link). */
  discardLastView: () => void;
  /** Pop the most recent snapshot and scroll back to it. */
  goBack: () => void;
}

const ReaderNavHistoryContext = createContext<ReaderNavHistory | null>(null);

/**
 * Access the reader's link-navigation history.
 *
 * @example
 * const { canGoBack, goBack } = useReaderNavHistory();
 */
export function useReaderNavHistory(): ReaderNavHistory {
  const context = useContext(ReaderNavHistoryContext);
  if (!context) {
    throw new Error(
      "useReaderNavHistory must be used within a ReaderNavHistoryProvider",
    );
  }
  return context;
}

interface ReaderNavHistoryProviderProps {
  documentId: string;
  children: ReactNode;
}

export function ReaderNavHistoryProvider({
  documentId,
  children,
}: Readonly<ReaderNavHistoryProviderProps>) {
  const { provides } = useScroll(documentId);
  const stackRef = useRef<SavedView[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);

  // The top-most visible page's `original.pageY` is the page-space Y at the
  // viewport top, which is exactly what `scrollToPage` aligns to on restore.
  const captureCurrentView = (): SavedView | null => {
    const top = provides?.getMetrics().pageVisibilityMetrics[0];
    if (!top) return null;
    return {
      pageNumber: top.pageNumber,
      x: top.original.pageX,
      y: top.original.pageY,
    };
  };

  const recordCurrentView = () => {
    const view = captureCurrentView();
    if (!view) return;
    stackRef.current.push(view);
    setCanGoBack(true);
  };

  const discardLastView = () => {
    stackRef.current.pop();
    setCanGoBack(stackRef.current.length > 0);
  };

  const goBack = () => {
    const view = stackRef.current.pop();
    setCanGoBack(stackRef.current.length > 0);
    if (!view) return;
    provides?.scrollToPage({
      pageNumber: view.pageNumber,
      pageCoordinates: { x: view.x, y: view.y },
      behavior: "instant",
    });
  };

  const value: ReaderNavHistory = {
    canGoBack,
    recordCurrentView,
    discardLastView,
    goBack,
  };

  return (
    <ReaderNavHistoryContext.Provider value={value}>
      {children}
    </ReaderNavHistoryContext.Provider>
  );
}
