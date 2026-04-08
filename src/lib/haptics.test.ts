import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  triggerHaptic,
  triggerRatingHaptic,
  triggerSuccessHaptic,
} from "./haptics";

describe("haptics", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  describe("triggerHaptic", () => {
    it("calls navigator.vibrate with default pattern when supported", () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(global, "navigator", {
        value: { vibrate: vibrateMock },
        writable: true,
      });

      triggerHaptic();

      expect(vibrateMock).toHaveBeenCalledWith(10);
    });

    it("calls navigator.vibrate with custom pattern", () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(global, "navigator", {
        value: { vibrate: vibrateMock },
        writable: true,
      });

      triggerHaptic([10, 50, 10]);

      expect(vibrateMock).toHaveBeenCalledWith([10, 50, 10]);
    });

    it("does not throw when navigator is undefined", () => {
      Object.defineProperty(global, "navigator", {
        value: undefined,
        writable: true,
      });

      expect(() => triggerHaptic()).not.toThrow();
    });

    it("does not throw when vibrate is not supported", () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
      });

      expect(() => triggerHaptic()).not.toThrow();
    });

    it("gracefully handles vibrate throwing", () => {
      const vibrateMock = vi.fn(() => {
        throw new Error("Vibration failed");
      });
      Object.defineProperty(global, "navigator", {
        value: { vibrate: vibrateMock },
        writable: true,
      });

      expect(() => triggerHaptic()).not.toThrow();
    });
  });

  describe("triggerRatingHaptic", () => {
    it("triggers short haptic pattern", () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(global, "navigator", {
        value: { vibrate: vibrateMock },
        writable: true,
      });

      triggerRatingHaptic();

      expect(vibrateMock).toHaveBeenCalledWith(10);
    });
  });

  describe("triggerSuccessHaptic", () => {
    it("triggers success haptic pattern", () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(global, "navigator", {
        value: { vibrate: vibrateMock },
        writable: true,
      });

      triggerSuccessHaptic();

      expect(vibrateMock).toHaveBeenCalledWith([10, 50, 10]);
    });
  });
});
