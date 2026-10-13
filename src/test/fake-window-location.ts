import { type Mock, vi } from "vitest";

type LocationAssignSpy = Mock<(href: string) => void>;

/**
 * Swaps `window.location` for a copy whose `assign` is a spy, because jsdom
 * marks the real `location.assign` as non-configurable and refuses `vi.spyOn`.
 * Pair it with `vi.unstubAllGlobals()` in `afterEach`.
 *
 * @example
 * const assignSpy = stubWindowLocationAssign();
 * expect(assignSpy).toHaveBeenCalledWith("/login");
 */
export function stubWindowLocationAssign(): LocationAssignSpy {
  const assignSpy: LocationAssignSpy = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign: assignSpy });
  return assignSpy;
}
