type HapticPattern = number | number[];

export function triggerHaptic(pattern: HapticPattern = 10): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch {
    // Gracefully ignore unsupported environments
  }
}

export function triggerRatingHaptic(): void {
  triggerHaptic(10);
}

export function triggerSuccessHaptic(): void {
  triggerHaptic([10, 50, 10]);
}
