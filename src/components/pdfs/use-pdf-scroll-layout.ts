"use client";

import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  buildPageTops,
  findPageAtOffset,
  type PageLayout,
  PDF_PAGE_GAP_PX,
  type ScrollAnchor,
  scrollAnchorAt,
  scrollOffsetOf,
} from "@/components/pdfs/pdf-page-layout";

// The reading line sits a third of the way down the viewport: the page that
// crosses it is the page being read.
const READING_LINE_RATIO = 1 / 3;

interface PdfScrollLayoutInput {
  scrollRef: RefObject<HTMLDivElement | null>;
  pageHeights: number[];
  initialPage: number;
}

export interface PdfScrollLayout {
  currentPage: number;
  scrollToPage: (page: number) => void;
}

function haveSameHeights(left: number[], right: number[]): boolean {
  return (
    left === right ||
    (left.length === right.length &&
      left.every((height, index) => height === right[index]))
  );
}

/**
 * Tracks the page under the reading line as the column scrolls, opens at the
 * saved page, and keeps the reader on the same spot of the same page whenever
 * page sizes change (zoom, rotation, real page sizes arriving).
 *
 * @example
 * const { currentPage, scrollToPage } = usePdfScrollLayout({ scrollRef, pageHeights, initialPage });
 */
export function usePdfScrollLayout({
  scrollRef,
  pageHeights,
  initialPage,
}: PdfScrollLayoutInput): PdfScrollLayout {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const previousLayoutRef = useRef<PageLayout | null>(null);
  // Last offset the user scrolled to, recorded on every scroll event so a
  // layout change never restores a stale position (which fought scrollbar
  // drags), and read before the browser clamps scrollTop to a shorter column.
  const lastScrollTopRef = useRef(0);
  const pageTops = buildPageTops(pageHeights, PDF_PAGE_GAP_PX);
  const layout: PageLayout = { tops: pageTops, heights: pageHeights };
  const pageTopsRef = useRef(pageTops);

  useLayoutEffect(() => {
    pageTopsRef.current = pageTops;
    const scroller = scrollRef.current;
    const previous = previousLayoutRef.current;
    if (!scroller || pageTops.length === 0) return;
    if (previous && haveSameHeights(previous.heights, pageHeights)) return;
    previousLayoutRef.current = layout;
    const anchor: ScrollAnchor = previous
      ? scrollAnchorAt(previous, lastScrollTopRef.current)
      : { page: initialPage, fraction: 0 };
    scroller.scrollTop = scrollOffsetOf(layout, anchor);
    lastScrollTopRef.current = scroller.scrollTop;
  });

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    let frame = 0;
    function updateCurrentPage() {
      if (!scroller) return;
      const line =
        scroller.scrollTop + scroller.clientHeight * READING_LINE_RATIO;
      setCurrentPage(findPageAtOffset(pageTopsRef.current, line));
    }
    function handleScroll() {
      if (!scroller) return;
      lastScrollTopRef.current = scroller.scrollTop;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateCurrentPage);
    }
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [scrollRef]);

  function scrollToPage(page: number) {
    const scroller = scrollRef.current;
    if (!scroller || pageTops.length === 0) return;
    scroller.scrollTop = scrollOffsetOf(layout, { page, fraction: 0 });
    setCurrentPage(page);
  }

  return { currentPage, scrollToPage };
}
