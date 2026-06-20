"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

/** The editor kinds that can be hosted inside a floating window. */
export type WindowKind = "mindmap" | "note" | "flashcard";

/** Absolute viewport position and size of a floating window, in pixels. */
export interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A single open window. `docId` is the mindmap/note id to load, or null for
 * the flashcard-creation window (which has no backing document). `geometry`
 * is the user-controlled position and size so windows can be moved and resized
 * over the page behind them.
 */
export interface WindowInstance {
  id: string;
  kind: WindowKind;
  docId: string | null;
  title: string;
  geometry: WindowGeometry;
}

export interface OpenWindowSpec {
  kind: WindowKind;
  docId?: string | null;
  title?: string;
}

export interface WindowManagerContextValue {
  windows: WindowInstance[];
  activeWindowId: string | null;
  openWindow: (spec: OpenWindowSpec) => void;
  closeWindow: (id: string) => void;
  /**
   * Close button entry point: runs the window content's registered guard (e.g.
   * a discard dialog or autosave flush) when present, otherwise closes directly.
   */
  requestCloseWindow: (id: string) => void;
  /**
   * Window content registers a guarded-close handler that fully owns closing the
   * window. Returns an unregister cleanup. See {@link useWindowCloseGuard}.
   */
  registerCloseRequest: (id: string, request: () => void) => () => void;
  minimizeActive: () => void;
  restore: (id: string) => void;
  /** Dock click: minimize when already active, otherwise restore. */
  toggle: (id: string) => void;
  setWindowTitle: (id: string, title: string) => void;
  setWindowGeometry: (id: string, geometry: WindowGeometry) => void;
}

const WindowManagerContext = createContext<WindowManagerContextValue | null>(
  null,
);

function defaultTitle(spec: OpenWindowSpec): string {
  if (spec.title && spec.title.trim().length > 0) {
    return spec.title;
  }
  return spec.kind === "flashcard" ? "New Flashcard" : "Untitled";
}

const WINDOW_MARGIN = 24;
const CASCADE_STEP = 28;

/**
 * Initial position and size for a freshly opened window. Each window cascades
 * by `openCount` so successive windows do not stack exactly on top of one
 * another, and is clamped to fit within the current viewport.
 */
function defaultGeometry(openCount: number): WindowGeometry {
  const hasWindow = globalThis.window !== undefined;
  const viewportWidth = hasWindow ? globalThis.innerWidth : 1280;
  const viewportHeight = hasWindow ? globalThis.innerHeight : 800;
  const width = Math.min(820, viewportWidth - WINDOW_MARGIN * 2);
  const height = Math.min(680, viewportHeight - WINDOW_MARGIN * 2);
  const offset = (openCount % 6) * CASCADE_STEP;
  const maxX = Math.max(WINDOW_MARGIN, viewportWidth - width - WINDOW_MARGIN);
  const maxY = Math.max(WINDOW_MARGIN, viewportHeight - height - WINDOW_MARGIN);
  return {
    x: Math.min(WINDOW_MARGIN + offset, maxX),
    y: Math.min(WINDOW_MARGIN + offset, maxY),
    width,
    height,
  };
}

/**
 * Holds the floating window stack for the app shell. Opening a window only
 * changes React state (never the route), so an immersive page such as the book
 * reader stays mounted behind the overlay. One window is visible at a time
 * (`activeWindowId`); the rest live minimized in the dock. Inactive windows stay
 * mounted but hidden so their editor state and unsaved input survive restore.
 *
 * @example
 * const { openWindow } = useWindowManager();
 * openWindow({ kind: "mindmap", docId: "m1", title: "Cell biology" });
 */
export function WindowManagerProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const nextIdRef = useRef(0);
  const closeRequestsRef = useRef<Map<string, () => void>>(new Map());

  // Mutators below only touch the state setters (stable) and refs, so they are
  // created once and kept stable across renders. This matters because effects
  // that sync a window's title depend on `setWindowTitle`; an unstable identity
  // would re-run them every render and loop. `setWindowTitle` also bails when
  // the title is unchanged so a settled sync produces no state churn.
  const closeWindow = useRef((id: string) => {
    closeRequestsRef.current.delete(id);
    setWindows((current) => current.filter((window) => window.id !== id));
    setActiveWindowId((current) => (current === id ? null : current));
  }).current;

  const setWindowTitle = useRef((id: string, title: string) => {
    setWindows((current) => {
      const target = current.find((window) => window.id === id);
      if (!target || target.title === title) {
        return current;
      }
      return current.map((window) =>
        window.id === id ? { ...window, title } : window,
      );
    });
  }).current;

  const setWindowGeometry = useRef((id: string, geometry: WindowGeometry) => {
    setWindows((current) =>
      current.map((window) =>
        window.id === id ? { ...window, geometry } : window,
      ),
    );
  }).current;

  const registerCloseRequest = useRef((id: string, request: () => void) => {
    closeRequestsRef.current.set(id, request);
    return () => {
      if (closeRequestsRef.current.get(id) === request) {
        closeRequestsRef.current.delete(id);
      }
    };
  }).current;
  const requestCloseWindow = useRef((id: string) => {
    const request = closeRequestsRef.current.get(id);
    if (request) {
      request();
      return;
    }
    closeWindow(id);
  }).current;

  const value = useMemo<WindowManagerContextValue>(() => {
    function openWindow(spec: OpenWindowSpec) {
      const docId = spec.docId ?? null;
      const existing = windows.find(
        (window) => window.kind === spec.kind && window.docId === docId,
      );
      if (existing) {
        setActiveWindowId(existing.id);
        return;
      }

      nextIdRef.current += 1;
      const id = `window-${nextIdRef.current}`;
      setWindows((current) => [
        ...current,
        {
          id,
          kind: spec.kind,
          docId,
          title: defaultTitle(spec),
          geometry: defaultGeometry(current.length),
        },
      ]);
      setActiveWindowId(id);
    }

    function restore(id: string) {
      setActiveWindowId(id);
    }

    function minimizeActive() {
      setActiveWindowId(null);
    }

    function toggle(id: string) {
      setActiveWindowId((current) => (current === id ? null : id));
    }

    return {
      windows,
      activeWindowId,
      openWindow,
      closeWindow,
      requestCloseWindow,
      registerCloseRequest,
      restore,
      minimizeActive,
      toggle,
      setWindowTitle,
      setWindowGeometry,
    };
  }, [
    windows,
    activeWindowId,
    closeWindow,
    setWindowTitle,
    setWindowGeometry,
    requestCloseWindow,
    registerCloseRequest,
  ]);

  return (
    <WindowManagerContext.Provider value={value}>
      {children}
    </WindowManagerContext.Provider>
  );
}

/**
 * Access the floating window manager. Throws when used outside the provider so
 * a missing mount surfaces immediately instead of silently no-opening.
 */
export function useWindowManager(): WindowManagerContextValue {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error(
      "useWindowManager must be used within a WindowManagerProvider",
    );
  }
  return context;
}
