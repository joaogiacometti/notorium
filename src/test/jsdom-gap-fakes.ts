// jsdom has no layout engine and skips a few DOM APIs that Radix and cmdk
// call. These fakes fill only those gaps so component tests exercise real
// library code instead of crashing on a missing global.

class FakeResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function installJsdomGapFakes(): void {
  // `.test.ts` files run in the node environment and have no DOM to patch.
  if (typeof document === "undefined") return;
  globalThis.ResizeObserver ??= FakeResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
}

installJsdomGapFakes();
