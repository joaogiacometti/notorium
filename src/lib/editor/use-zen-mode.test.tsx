import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useZenMode } from "@/lib/editor/use-zen-mode";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function ZenModeHarness() {
  const { isZenMode, toggleZenMode } = useZenMode();

  return (
    <button type="button" data-zen={isZenMode} onClick={toggleZenMode}>
      toggle
    </button>
  );
}

function dispatchEscape(options: KeyboardEventInit = {}) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
      ...options,
    }),
  );
}

describe("useZenMode", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  function getToggleButton() {
    const button = container.querySelector("button");
    if (!button) {
      throw new Error("Expected zen mode harness button to be rendered.");
    }
    return button;
  }

  it("starts disabled and toggles on", async () => {
    await act(async () => {
      root.render(<ZenModeHarness />);
    });

    expect(getToggleButton().dataset.zen).toBe("false");

    await act(async () => {
      getToggleButton().click();
    });

    expect(getToggleButton().dataset.zen).toBe("true");
  });

  it("exits on Escape while active", async () => {
    await act(async () => {
      root.render(<ZenModeHarness />);
    });

    await act(async () => {
      getToggleButton().click();
    });

    await act(async () => {
      dispatchEscape();
    });

    expect(getToggleButton().dataset.zen).toBe("false");
  });

  it("ignores Escape events already consumed by another handler", async () => {
    await act(async () => {
      root.render(<ZenModeHarness />);
    });

    await act(async () => {
      getToggleButton().click();
    });

    const consumeEscape = (event: KeyboardEvent) => event.preventDefault();
    document.addEventListener("keydown", consumeEscape, { capture: true });

    try {
      await act(async () => {
        dispatchEscape();
      });
    } finally {
      document.removeEventListener("keydown", consumeEscape, {
        capture: true,
      });
    }

    expect(getToggleButton().dataset.zen).toBe("true");
  });

  it("ignores other keys", async () => {
    await act(async () => {
      root.render(<ZenModeHarness />);
    });

    await act(async () => {
      getToggleButton().click();
    });

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });

    expect(getToggleButton().dataset.zen).toBe("true");
  });
});
