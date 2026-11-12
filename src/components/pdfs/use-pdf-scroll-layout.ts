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
  scrollRef: RefObject<HTMLElement | null>;
  pageHeights: number[];
  initialPage: number;
}

export interface PdfScrollLayout {
  currentPage: number;
  /**
   * Keeps what is under a viewport point in place through the next page
   * resize, instead of what is at the top of the column: zoom gestures.
   */
  holdPoint: (point: { clientX: number; clientY: number }) => void;
  scrollToPage: (page: number) => void;
  followPageLink: (page: number) => void;
  canGoBack: boolean;
  goBack: () => void;
}

interface HeldPoint {
  /** How far below the column's top edge the point sits. */
  top: number;
  clientX: number;
  /** The point's horizontal position as a fraction of a page's width. */
  pageFraction: number;
}

// Pages share one width and are centered together, so any one of them places
// a point horizontally.
function firstPageOf(scroller: HTMLElement): Element | null {
  return scroller.querySelector("[data-page-number]");
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
  const [linkHistory, setLinkHistory] = useState<ScrollAnchor[]>([]);
  const previousLayoutRef = useRef<PageLayout | null>(null);
  // Last offset the user scrolled to, recorded on every scroll event so a
  // layout change never restores a stale position (which fought scrollbar
  // drags), and read before the browser clamps scrollTop to a shorter column.
  const lastScrollTopRef = useRef(0);
  const heldPointRef = useRef<HeldPoint | null>(null);
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
    const held = heldPointRef.current;
    heldPointRef.current = null;
    const lead = previous && held ? held.top : 0;
    const anchor: ScrollAnchor = previous
      ? scrollAnchorAt(previous, lastScrollTopRef.current + lead)
      : { page: initialPage, fraction: 0 };
    scroller.scrollTop = scrollOffsetOf(layout, anchor) - lead;
    lastScrollTopRef.current = scroller.scrollTop;
    const page = firstPageOf(scroller);
    if (previous && held && page) {
      const box = page.getBoundingClientRect();
      scroller.scrollLeft +=
        box.left + held.pageFraction * box.width - held.clientX;
    }
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
      // A point held for a resize that never came must not hijack a later one.
      heldPointRef.current = null;
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
    lastScrollTopRef.current = scroller.scrollTop;
    setCurrentPage(page);
  }

  function holdPoint(point: { clientX: number; clientY: number }) {
    const scroller = scrollRef.current;
    const page = scroller && firstPageOf(scroller);
    if (!scroller || !page) return;
    const box = page.getBoundingClientRect();
    heldPointRef.current = {
      top: point.clientY - scroller.getBoundingClientRect().top,
      clientX: point.clientX,
      pageFraction: box.width > 0 ? (point.clientX - box.left) / box.width : 0,
    };
  }

  function followPageLink(page: number) {
    const scroller = scrollRef.current;
    if (!scroller || pageTops.length === 0) return;
    const origin = scrollAnchorAt(layout, scroller.scrollTop);
    setLinkHistory((history) => [...history, origin]);
    scrollToPage(page);
  }

  function goBack() {
    const origin = linkHistory.at(-1);
    const scroller = scrollRef.current;
    if (!origin || !scroller || pageTops.length === 0) return;
    scroller.scrollTop = scrollOffsetOf(layout, origin);
    lastScrollTopRef.current = scroller.scrollTop;
    setCurrentPage(origin.page);
    setLinkHistory((history) => history.slice(0, -1));
  }

  return {
    currentPage,
    holdPoint,
    scrollToPage,
    followPageLink,
    canGoBack: linkHistory.length > 0,
    goBack,
  };
}
