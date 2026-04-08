"use client";

import { useEffect, useRef, useState } from "react";

export type SwipeDirection = "left" | "right" | null;

interface SwipeState {
  direction: SwipeDirection;
  progress: number;
  isSwiping: boolean;
}

interface UseSwipeGestureOptions {
  threshold?: number;
  enabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

interface SwipeGestureResult {
  swipeState: SwipeState;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  reset: () => void;
}

const DEFAULT_THRESHOLD = 60;
const MAX_PROGRESS_DISTANCE = 150;

export function shouldCancelSwipeForVerticalMovement(
  deltaX: number,
  deltaY: number,
  hasExceededThreshold: boolean,
): boolean {
  return !hasExceededThreshold && Math.abs(deltaY) > Math.abs(deltaX);
}

export function getSwipeDirectionAndProgress(deltaX: number): {
  direction: SwipeDirection;
  progress: number;
} {
  return {
    direction: deltaX > 0 ? "right" : deltaX < 0 ? "left" : null,
    progress: Math.min(Math.abs(deltaX) / MAX_PROGRESS_DISTANCE, 1),
  };
}

export function hasReachedSwipeThreshold(
  progress: number,
  threshold: number,
): boolean {
  return progress * MAX_PROGRESS_DISTANCE >= threshold;
}

export function useSwipeGesture(
  options: UseSwipeGestureOptions = {},
): SwipeGestureResult {
  const {
    threshold = DEFAULT_THRESHOLD,
    enabled = true,
    onSwipeLeft,
    onSwipeRight,
  } = options;

  const [swipeState, setSwipeState] = useState<SwipeState>({
    direction: null,
    progress: 0,
    isSwiping: false,
  });

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isTrackingRef = useRef(false);
  const hasExceededThresholdRef = useRef(false);

  function reset() {
    setSwipeState({ direction: null, progress: 0, isSwiping: false });
    isTrackingRef.current = false;
    hasExceededThresholdRef.current = false;
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (!enabled) return;

    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    isTrackingRef.current = true;
    hasExceededThresholdRef.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!enabled || !isTrackingRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    if (
      shouldCancelSwipeForVerticalMovement(
        deltaX,
        deltaY,
        hasExceededThresholdRef.current,
      )
    ) {
      isTrackingRef.current = false;
      reset();
      return;
    }

    if (Math.abs(deltaX) > 10) {
      hasExceededThresholdRef.current = true;
    }

    const { direction, progress } = getSwipeDirectionAndProgress(deltaX);

    setSwipeState({
      direction,
      progress,
      isSwiping: true,
    });
  }

  function handleTouchEnd() {
    if (!enabled || !isTrackingRef.current) {
      reset();
      return;
    }

    const { direction, progress } = swipeState;
    const exceededThreshold = hasReachedSwipeThreshold(progress, threshold);

    if (exceededThreshold && direction) {
      if (direction === "left" && onSwipeLeft) {
        onSwipeLeft();
      } else if (direction === "right" && onSwipeRight) {
        onSwipeRight();
      }
    }

    reset();
  }

  useEffect(() => {
    if (!enabled) {
      setSwipeState({ direction: null, progress: 0, isSwiping: false });
      isTrackingRef.current = false;
      hasExceededThresholdRef.current = false;
    }
  }, [enabled]);

  return {
    swipeState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    reset,
  };
}
