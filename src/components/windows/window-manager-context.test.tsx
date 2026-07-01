import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  useWindowManager,
  type WindowManagerContextValue,
  WindowManagerProvider,
} from "@/components/windows/window-manager-context";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLElement;
let root: Root;
let api: WindowManagerContextValue;

function Capture() {
  api = useWindowManager();
  return null;
}

function render() {
  act(() => {
    root.render(
      <WindowManagerProvider>
        <Capture />
      </WindowManagerProvider>,
    );
  });
}

beforeEach(() => {
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  render();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("WindowManagerProvider", () => {
  it("opens a window and makes it the active one", () => {
    act(() => api.openWindow({ kind: "mindmap", docId: "m1" }));

    expect(api.windows).toHaveLength(1);
    expect(api.windows[0]).toMatchObject({ kind: "mindmap", docId: "m1" });
    expect(api.activeWindowId).toBe(api.windows[0].id);
    expect(api.focusedWindowId).toBe(api.windows[0].id);
  });

  it("reactivates an existing window for the same kind and doc instead of duplicating", () => {
    act(() => api.openWindow({ kind: "note", docId: "n1" }));
    const firstId = api.windows[0].id;
    act(() => api.openWindow({ kind: "flashcard" }));

    act(() => api.openWindow({ kind: "note", docId: "n1" }));

    expect(api.windows).toHaveLength(2);
    expect(api.activeWindowId).toBe(firstId);
    expect(api.focusedWindowId).toBe(firstId);
  });

  it("keeps a single flashcard window across repeated opens", () => {
    act(() => api.openWindow({ kind: "flashcard" }));
    act(() => api.openWindow({ kind: "flashcard" }));

    expect(api.windows).toHaveLength(1);
  });

  it("keeps flashcard create and edit windows separate", () => {
    act(() => api.openWindow({ kind: "flashcard" }));
    act(() => api.openWindow({ kind: "flashcard", docId: "fc1" }));

    expect(api.windows).toHaveLength(2);
    expect(api.windows[0]).toMatchObject({
      kind: "flashcard",
      docId: null,
      title: "New Flashcard",
    });
    expect(api.windows[1]).toMatchObject({
      kind: "flashcard",
      docId: "fc1",
      title: "Edit Flashcard",
    });
  });

  it("reactivates an existing flashcard edit window", () => {
    act(() => api.openWindow({ kind: "flashcard", docId: "fc1" }));
    const firstId = api.windows[0].id;

    act(() => api.openWindow({ kind: "flashcard", docId: "fc1" }));

    expect(api.windows).toHaveLength(1);
    expect(api.activeWindowId).toBe(firstId);
    expect(api.focusedWindowId).toBe(firstId);
  });

  it("minimizes and restores so only one window is active at a time", () => {
    act(() => api.openWindow({ kind: "mindmap", docId: "m1" }));
    const firstId = api.windows[0].id;
    act(() => api.openWindow({ kind: "note", docId: "n1" }));

    expect(api.activeWindowId).toBe(api.windows[1].id);
    expect(api.focusedWindowId).toBe(api.windows[1].id);

    act(() => api.minimizeActive());
    expect(api.activeWindowId).toBeNull();
    expect(api.focusedWindowId).toBeNull();

    act(() => api.restore(firstId));
    expect(api.activeWindowId).toBe(firstId);
    expect(api.focusedWindowId).toBe(firstId);
  });

  it("toggles a window between active and minimized", () => {
    act(() => api.openWindow({ kind: "mindmap", docId: "m1" }));
    const id = api.windows[0].id;

    act(() => api.toggle(id));
    expect(api.activeWindowId).toBeNull();
    expect(api.focusedWindowId).toBeNull();

    act(() => api.toggle(id));
    expect(api.activeWindowId).toBe(id);
    expect(api.focusedWindowId).toBe(id);
  });

  it("focuses the page without minimizing the visible window", () => {
    act(() => api.openWindow({ kind: "mindmap", docId: "m1" }));
    const id = api.windows[0].id;

    act(() => api.focusWindow(null));

    expect(api.activeWindowId).toBe(id);
    expect(api.focusedWindowId).toBeNull();
  });

  it("clears the active id when the active window is closed", () => {
    act(() => api.openWindow({ kind: "note", docId: "n1" }));
    const id = api.windows[0].id;

    act(() => api.closeWindow(id));

    expect(api.windows).toHaveLength(0);
    expect(api.activeWindowId).toBeNull();
    expect(api.focusedWindowId).toBeNull();
  });

  it("runs a registered close guard instead of closing the window", () => {
    act(() => api.openWindow({ kind: "flashcard" }));
    const id = api.windows[0].id;
    let calls = 0;
    act(() => {
      api.registerCloseRequest(id, () => {
        calls += 1;
      });
    });

    act(() => api.requestCloseWindow(id));

    expect(calls).toBe(1);
    expect(api.windows).toHaveLength(1);
  });

  it("closes directly when no close guard is registered", () => {
    act(() => api.openWindow({ kind: "note", docId: "n1" }));
    const id = api.windows[0].id;

    act(() => api.requestCloseWindow(id));

    expect(api.windows).toHaveLength(0);
  });

  it("falls back to a direct close after the guard is unregistered", () => {
    act(() => api.openWindow({ kind: "note", docId: "n1" }));
    const id = api.windows[0].id;
    let unregister: () => void = () => {};
    act(() => {
      unregister = api.registerCloseRequest(id, () => {});
    });

    act(() => unregister());
    act(() => api.requestCloseWindow(id));

    expect(api.windows).toHaveLength(0);
  });

  it("clears a window's close guard when it is closed", () => {
    act(() => api.openWindow({ kind: "flashcard" }));
    const id = api.windows[0].id;
    let calls = 0;
    act(() => {
      api.registerCloseRequest(id, () => {
        calls += 1;
      });
    });

    act(() => api.closeWindow(id));
    act(() => api.requestCloseWindow(id));

    expect(calls).toBe(0);
    expect(api.windows).toHaveLength(0);
  });

  it("updates a window title for the dock label", () => {
    act(() => api.openWindow({ kind: "mindmap", docId: "m1" }));
    const id = api.windows[0].id;

    act(() => api.setWindowTitle(id, "Cell biology"));

    expect(api.windows[0].title).toBe("Cell biology");
  });

  it("gives a new window a positive default geometry", () => {
    act(() => api.openWindow({ kind: "mindmap", docId: "m1" }));

    const { geometry } = api.windows[0];
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.height).toBeGreaterThan(0);
    expect(geometry.x).toBeGreaterThanOrEqual(0);
    expect(geometry.y).toBeGreaterThanOrEqual(0);
  });

  it("cascades successive windows so they do not stack exactly", () => {
    act(() => api.openWindow({ kind: "mindmap", docId: "m1" }));
    act(() => api.openWindow({ kind: "note", docId: "n1" }));

    expect(api.windows[1].geometry.x).toBeGreaterThan(
      api.windows[0].geometry.x,
    );
    expect(api.windows[1].geometry.y).toBeGreaterThan(
      api.windows[0].geometry.y,
    );
  });

  it("updates window geometry after a move or resize", () => {
    act(() => api.openWindow({ kind: "mindmap", docId: "m1" }));
    const id = api.windows[0].id;

    act(() =>
      api.setWindowGeometry(id, { x: 120, y: 80, width: 500, height: 400 }),
    );

    expect(api.windows[0].geometry).toEqual({
      x: 120,
      y: 80,
      width: 500,
      height: 400,
    });
  });
});
