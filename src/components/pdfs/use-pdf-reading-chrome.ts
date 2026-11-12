"use client";

import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";

// Finger travel before a drag counts as reading on, so a tap that wobbles
// does not hide the controls.
const DRAG_THRESHOLD_PX = 16;
// Wheel travel only adds up while it keeps coming: a trackpad at rest sends
// stray one-pixel deltas in either direction, which must not flip the controls.
const WHEEL_PAUSE_MS = 200;
const WHEEL_LINE_PX = 16;

interface PdfReadingChromeInput {
  scrollRef: RefObject<HTMLElement | null>;
  /** False where the controls always stay: wide screens outside zen mode. */
  enabled: boolean;
  hidden: boolean;
  onHiddenChange: (hidden: boolean) => void;
}

/**
 * Hides the reading controls while the reader drags or wheels down the pages
 * and brings them back when they go up or tap a page. Both need a little
 * travel first, so a wobble does nothing. It follows the gesture,
 * not the scroll position, so page jumps from the controls never hide them.
 *
 * @example
 * usePdfReadingChrome({ scrollRef, enabled: isPhone, hidden, onHiddenChange: setHidden });
 */
export function usePdfReadingChrome({
  scrollRef,
  enabled,
  hidden,
  onHiddenChange,
}: PdfReadingChromeInput): void {
  const dragStartRef = useRef<number | null>(null);
  const topBeforeChangeRef = useRef<number | null>(null);

  // Controls above the pages change where the scroller starts. Scrolling by
  // the same amount keeps the text where the reader's eyes already are. It
  // runs after every render so it catches the one that moved the controls.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const topBefore = topBeforeChangeRef.current;
    topBeforeChangeRef.current = null;
    if (!scroller || topBefore === null) return;
    scroller.scrollTop += scroller.getBoundingClientRect().top - topBefore;
  });

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !enabled) return;

    function change(next: boolean) {
      if (!scroller || next === hidden) return;
      topBeforeChangeRef.current = scroller.getBoundingClientRect().top;
      onHiddenChange(next);
    }

    function handleTouchStart(event: TouchEvent) {
      dragStartRef.current =
        event.touches.length === 1 ? event.touches[0].clientY : null;
    }

    function handleTouchMove(event: TouchEvent) {
      const start = dragStartRef.current;
      if (start === null || event.touches.length !== 1) {
        dragStartRef.current = null;
        return;
      }
      const travel = start - event.touches[0].clientY;
      if (Math.abs(travel) < DRAG_THRESHOLD_PX) return;
      dragStartRef.current = event.touches[0].clientY;
      change(travel > 0);
    }

    let wheelTravel = 0;
    let wheelAt = 0;

    function handleWheel(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey || event.deltaY === 0) return;
      const delta =
        event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
          ? event.deltaY
          : event.deltaY * WHEEL_LINE_PX;
      const turned = Math.sign(delta) !== Math.sign(wheelTravel);
      if (turned || event.timeStamp - wheelAt > WHEEL_PAUSE_MS) wheelTravel = 0;
      wheelAt = event.timeStamp;
      wheelTravel += delta;
      if (Math.abs(wheelTravel) < DRAG_THRESHOLD_PX) return;
      wheelTravel = 0;
      change(delta > 0);
    }

    // A mouse click places a caret or starts a selection; only a tap toggles.
    function handleClick(event: MouseEvent) {
      if ("pointerType" in event && event.pointerType === "mouse") return;
      const onControl =
        event.target instanceof Element &&
        event.target.closest("a, button, input");
      const selecting = !(document.getSelection()?.isCollapsed ?? true);
      if (!onControl && !selecting) change(!hidden);
    }

    scroller.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    scroller.addEventListener("touchmove", handleTouchMove, { passive: true });
    scroller.addEventListener("wheel", handleWheel, { passive: true });
    scroller.addEventListener("click", handleClick);
    return () => {
      scroller.removeEventListener("touchstart", handleTouchStart);
      scroller.removeEventListener("touchmove", handleTouchMove);
      scroller.removeEventListener("wheel", handleWheel);
      scroller.removeEventListener("click", handleClick);
    };
  }, [scrollRef, enabled, hidden, onHiddenChange]);
}
