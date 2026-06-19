"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useRef,
} from "react";
import type { WindowGeometry } from "@/components/windows/window-manager-context";

/** The eight directions a window can be resized from, named like compass edges. */
export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type DragKind = "move" | ResizeEdge;

const MIN_WIDTH = 360;
const MIN_HEIGHT = 260;

interface DragSession {
  kind: DragKind;
  pointerX: number;
  pointerY: number;
  start: WindowGeometry;
  current: WindowGeometry;
}

export interface WindowDragHandlers {
  startMove: (event: ReactPointerEvent) => void;
  startResize: (edge: ResizeEdge, event: ReactPointerEvent) => void;
}

function viewport(): { width: number; height: number } {
  if (globalThis.window === undefined) {
    return { width: 1280, height: 800 };
  }
  return { width: globalThis.innerWidth, height: globalThis.innerHeight };
}

function clampMove(geometry: WindowGeometry): WindowGeometry {
  const { width: vw, height: vh } = viewport();
  return {
    ...geometry,
    x: Math.min(Math.max(0, geometry.x), Math.max(0, vw - geometry.width)),
    y: Math.min(Math.max(0, geometry.y), Math.max(0, vh - geometry.height)),
  };
}

function resizeFromEdge(
  edge: ResizeEdge,
  dx: number,
  dy: number,
  start: WindowGeometry,
): WindowGeometry {
  const next = { ...start };
  if (edge.includes("e")) next.width = start.width + dx;
  if (edge.includes("s")) next.height = start.height + dy;
  if (edge.includes("w")) {
    next.width = start.width - dx;
    next.x = start.x + dx;
  }
  if (edge.includes("n")) {
    next.height = start.height - dy;
    next.y = start.y + dy;
  }
  return clampResize(edge, next, start);
}

/** Enforce minimum size while keeping the edge opposite the drag anchored. */
function clampResize(
  edge: ResizeEdge,
  geometry: WindowGeometry,
  start: WindowGeometry,
): WindowGeometry {
  const next = { ...geometry };
  if (next.width < MIN_WIDTH) {
    if (edge.includes("w")) {
      next.x = start.x + start.width - MIN_WIDTH;
    }
    next.width = MIN_WIDTH;
  }
  if (next.height < MIN_HEIGHT) {
    if (edge.includes("n")) {
      next.y = start.y + start.height - MIN_HEIGHT;
    }
    next.height = MIN_HEIGHT;
  }
  return next;
}

function applyDrag(
  session: DragSession,
  dx: number,
  dy: number,
): WindowGeometry {
  if (session.kind === "move") {
    return clampMove({
      ...session.start,
      x: session.start.x + dx,
      y: session.start.y + dy,
    });
  }
  return resizeFromEdge(session.kind, dx, dy, session.start);
}

/**
 * Drag-to-move and drag-to-resize for a floating window. To keep heavy editor
 * content smooth, the live geometry is written straight to the frame element's
 * inline styles during the gesture and only committed to React state on pointer
 * up, so the editor does not re-render on every pointer move.
 *
 * @example
 * const { startMove, startResize } = useWindowDrag(frameRef, geometry, onCommit);
 * <div onPointerDown={startMove} /> // title bar
 */
export function useWindowDrag(
  frameRef: RefObject<HTMLDivElement | null>,
  geometry: WindowGeometry,
  onCommit: (geometry: WindowGeometry) => void,
): WindowDragHandlers {
  const sessionRef = useRef<DragSession | null>(null);
  const geometryRef = useRef(geometry);
  geometryRef.current = geometry;

  function applyToDom(next: WindowGeometry) {
    const element = frameRef.current;
    if (!element) {
      return;
    }
    element.style.left = `${next.x}px`;
    element.style.top = `${next.y}px`;
    element.style.width = `${next.width}px`;
    element.style.height = `${next.height}px`;
  }

  function handlePointerMove(event: PointerEvent) {
    const session = sessionRef.current;
    if (!session) {
      return;
    }
    const dx = event.clientX - session.pointerX;
    const dy = event.clientY - session.pointerY;
    session.current = applyDrag(session, dx, dy);
    applyToDom(session.current);
  }

  function handlePointerUp() {
    const session = sessionRef.current;
    globalThis.removeEventListener("pointermove", handlePointerMove);
    globalThis.removeEventListener("pointerup", handlePointerUp);
    sessionRef.current = null;
    if (session) {
      onCommit(session.current);
    }
  }

  function begin(kind: DragKind, event: ReactPointerEvent) {
    event.preventDefault();
    sessionRef.current = {
      kind,
      pointerX: event.clientX,
      pointerY: event.clientY,
      start: geometryRef.current,
      current: geometryRef.current,
    };
    globalThis.addEventListener("pointermove", handlePointerMove);
    globalThis.addEventListener("pointerup", handlePointerUp);
  }

  return {
    startMove: (event) => begin("move", event),
    startResize: (edge, event) => begin(edge, event),
  };
}
