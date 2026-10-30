"use client";

import { type RefObject, useEffect } from "react";
import { clampPdfZoom } from "@/components/pdfs/pdf-page-layout";

const WHEEL_COMMIT_DELAY_MS = 180;
const WHEEL_ZOOM_SENSITIVITY = 300;

interface PdfGestureZoomInput {
  scrollRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  onZoomCommit: (zoom: number) => void;
}

function touchDistance(touches: TouchList): number {
  const [first, second] = [touches[0], touches[1]];
  return Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY,
  );
}

/**
 * Pinch (touch) and Ctrl/⌘ + wheel (mouse, trackpad pinch) zoom the PDF
 * instead of the page. While the gesture runs the pages are only scaled with
 * a CSS transform; the new zoom is committed once, at the end, so pages
 * re-render sharply a single time.
 *
 * @example
 * usePdfGestureZoom({ scrollRef, contentRef, zoom, onZoomCommit: setZoom });
 */
export function usePdfGestureZoom({
  scrollRef,
  contentRef,
  zoom,
  onZoomCommit,
}: PdfGestureZoomInput): void {
  useEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!scroller || !content) {
      return;
    }

    let previewScale = 1;
    let pinchStartDistance = 0;
    let wheelTimer: number | undefined;

    function preview(scale: number) {
      previewScale = clampPdfZoom(zoom * scale) / zoom;
      if (content) content.style.transform = `scale(${previewScale})`;
    }

    function commit() {
      if (content) content.style.transform = "";
      if (previewScale !== 1) onZoomCommit(clampPdfZoom(zoom * previewScale));
      previewScale = 1;
    }

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      preview(previewScale * Math.exp(-event.deltaY / WHEEL_ZOOM_SENSITIVITY));
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(commit, WHEEL_COMMIT_DELAY_MS);
    }

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length === 2) {
        pinchStartDistance = touchDistance(event.touches);
      }
    }

    function handleTouchMove(event: TouchEvent) {
      if (event.touches.length !== 2 || pinchStartDistance === 0) return;
      event.preventDefault();
      preview(touchDistance(event.touches) / pinchStartDistance);
    }

    function handleTouchEnd(event: TouchEvent) {
      if (pinchStartDistance === 0 || event.touches.length >= 2) return;
      pinchStartDistance = 0;
      commit();
    }

    scroller.addEventListener("wheel", handleWheel, { passive: false });
    scroller.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    scroller.addEventListener("touchmove", handleTouchMove, { passive: false });
    scroller.addEventListener("touchend", handleTouchEnd);
    scroller.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      window.clearTimeout(wheelTimer);
      scroller.removeEventListener("wheel", handleWheel);
      scroller.removeEventListener("touchstart", handleTouchStart);
      scroller.removeEventListener("touchmove", handleTouchMove);
      scroller.removeEventListener("touchend", handleTouchEnd);
      scroller.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [scrollRef, contentRef, zoom, onZoomCommit]);
}
