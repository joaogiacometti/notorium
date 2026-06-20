"use client";

import { useEffect, useRef } from "react";

/**
 * Lets an editor hosted inside a floating window intercept the window's close
 * button so unsaved work is guarded instead of silently discarded. The window's
 * close button runs the registered `requestClose` (e.g. show a discard dialog,
 * or flush a pending autosave) and that handler owns actually closing the
 * window. `requestClose` is read fresh on every invocation, so it may close over
 * changing state without re-registering. No-op when the editor is not embedded
 * in a window (`register` is undefined).
 *
 * @example
 * useWindowCloseGuard(registerCloseRequest, () => handleOpenChange(false));
 */
export function useWindowCloseGuard(
  register: ((request: () => void) => () => void) | undefined,
  requestClose: () => void,
): void {
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    if (!register) {
      return;
    }
    return register(() => requestCloseRef.current());
  }, [register]);
}
