"use client";

import { Portal } from "radix-ui";
import type { ReactNode } from "react";
import { RemoveScroll } from "react-remove-scroll";

interface ReviewScrollBoundaryProps {
  children: ReactNode;
}

/**
 * Isolates session scrolling, including portaled dialogs, from the app shell.
 * @example <ReviewScrollBoundary>{session}{dialogs}</ReviewScrollBoundary>
 */
export function ReviewScrollBoundary({ children }: ReviewScrollBoundaryProps) {
  return (
    <Portal.Root asChild>
      <RemoveScroll allowPinchZoom className="fixed inset-0 z-110">
        {children}
      </RemoveScroll>
    </Portal.Root>
  );
}
