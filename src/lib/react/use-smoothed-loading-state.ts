"use client";

import { useEffect, useRef, useState } from "react";

interface UseSmoothedLoadingStateOptions {
  delayMs: number;
  minimumVisibleMs: number;
}

export function useSmoothedLoadingState(
  isLoading: boolean,
  { delayMs, minimumVisibleMs }: Readonly<UseSmoothedLoadingStateOptions>,
) {
  const [isVisible, setIsVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (isLoading) {
      if (isVisible) {
        return;
      }

      showTimeoutRef.current = setTimeout(() => {
        shownAtRef.current = Date.now();
        setIsVisible(true);
        showTimeoutRef.current = null;
      }, delayMs);

      return;
    }

    if (!isVisible) {
      shownAtRef.current = null;
      return;
    }

    const shownAt = shownAtRef.current;

    if (shownAt === null) {
      setIsVisible(false);
      return;
    }

    const elapsedMs = Date.now() - shownAt;
    const remainingMs = Math.max(minimumVisibleMs - elapsedMs, 0);

    if (remainingMs === 0) {
      shownAtRef.current = null;
      setIsVisible(false);
      return;
    }

    hideTimeoutRef.current = setTimeout(() => {
      shownAtRef.current = null;
      setIsVisible(false);
      hideTimeoutRef.current = null;
    }, remainingMs);

    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [delayMs, isLoading, isVisible, minimumVisibleMs]);

  return isVisible;
}
