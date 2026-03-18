"use client";

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs?: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    if (delayMs === undefined) {
      setDebouncedValue(value);
      return;
    }

    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}
