"use client";

import { useEffectEvent, useLayoutEffect, useRef, useState } from "react";

/** Move a stable portal node between focus boundaries without remounting chat.
 * @example const { target, fallbackRef } = useAssistantPortalTarget(host, true);
 */
export function useAssistantPortalTarget(
  host: HTMLElement | null,
  enabled: boolean,
  registerTarget?: (target: HTMLElement, fallback: HTMLElement) => () => void,
) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const connect = useEffectEvent((target: HTMLElement, fallback: HTMLElement) =>
    registerTarget?.(target, fallback),
  );
  useLayoutEffect(() => {
    if (!enabled || !fallbackRef.current) return;
    const element = document.createElement("div");
    const disconnect = connect(element, fallbackRef.current);
    setTarget(element);
    return () => {
      disconnect?.();
      element.remove();
    };
  }, [enabled]);
  useLayoutEffect(() => {
    const destination = host ?? fallbackRef.current;
    if (target && destination && target.parentNode !== destination)
      destination.append(target);
  }, [host, target]);
  return { target, fallbackRef };
}
