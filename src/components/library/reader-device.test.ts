import { afterEach, describe, expect, it } from "vitest";
import { detectReaderDevice } from "@/components/library/reader-device";

// happy-dom provides a non-touch window/navigator by default, so the baseline is
// "desktop". Each touch case mutates one signal and is restored afterwards.
const originalMaxTouchPoints = navigator.maxTouchPoints;

afterEach(() => {
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: originalMaxTouchPoints,
    configurable: true,
  });
  if ("ontouchstart" in window) {
    delete (window as unknown as Record<string, unknown>).ontouchstart;
  }
});

describe("detectReaderDevice", () => {
  it("reports desktop when there is no touch signal", () => {
    expect(detectReaderDevice()).toBe("desktop");
  });

  it("reports mobile when the platform exposes touch points", () => {
    Object.defineProperty(navigator, "maxTouchPoints", {
      value: 5,
      configurable: true,
    });
    expect(detectReaderDevice()).toBe("mobile");
  });

  it("reports mobile when window exposes ontouchstart", () => {
    (window as unknown as Record<string, unknown>).ontouchstart = null;
    expect(detectReaderDevice()).toBe("mobile");
  });
});
