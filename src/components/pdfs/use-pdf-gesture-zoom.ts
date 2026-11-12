"use client";

import { type RefObject, useEffect } from "react";
import { clampPdfZoom } from "@/components/pdfs/pdf-page-layout";

const WHEEL_COMMIT_DELAY_MS = 180;
const WHEEL_ZOOM_SENSITIVITY = 300;

/** Where a zoom gesture is centered, in viewport coordinates. */
export interface PdfZoomFocus {
  clientX: number;
  clientY: number;
}

interface PdfGestureZoomInput {
  scrollRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  onZoomCommit: (zoom: number, focus: PdfZoomFocus) => void;
}

function touchCenter(touches: TouchList): PdfZoomFocus {
  const [first, second] = [touches[0], touches[1]];
  return {
    clientX: (first.clientX + second.clientX) / 2,
    clientY: (first.clientY + second.clientY) / 2,
  };
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
 * instead of the page, around the pointer or the middle of the fingers. While
 * the gesture runs the pages are only scaled with a CSS transform about that
 * point; the new zoom is committed once, at the end, with the point to keep
 * in place, so pages re-render sharply a single time.
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
    let focus: PdfZoomFocus | null = null;

    // The column holds every page, so scaling about any fixed corner of it
    // would throw the pages being read far out of view.
    function begin(point: PdfZoomFocus) {
      if (!content) return;
      focus = point;
      const box = content.getBoundingClientRect();
      content.style.transformOrigin = `${point.clientX - box.left}px ${point.clientY - box.top}px`;
    }

    function preview(scale: number) {
      previewScale = clampPdfZoom(zoom * scale) / zoom;
      if (content) content.style.transform = `scale(${previewScale})`;
    }

    function commit() {
      if (content) {
        content.style.transform = "";
        content.style.transformOrigin = "";
      }
      if (previewScale !== 1 && focus) {
        onZoomCommit(clampPdfZoom(zoom * previewScale), focus);
      }
      previewScale = 1;
      focus = null;
    }

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (!focus) begin(event);
      preview(previewScale * Math.exp(-event.deltaY / WHEEL_ZOOM_SENSITIVITY));
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(commit, WHEEL_COMMIT_DELAY_MS);
    }

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length === 2) {
        pinchStartDistance = touchDistance(event.touches);
        begin(touchCenter(event.touches));
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
