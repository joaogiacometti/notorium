"use client";

import type { Node } from "@xyflow/react";
import { type RefObject, useEffect, useRef } from "react";
import {
  MINDMAP_IMAGE_DEFAULT_SIZE,
  MINDMAP_IMAGE_MAX_SIZE,
} from "@/features/mindmaps/constants";
import { type ImageBox, scaleImageToBox } from "@/features/mindmaps/image-size";
import { getPastedImageFile } from "@/lib/editor/clipboard-image";
import { uploadMindmapImage } from "@/lib/mindmap/upload-mindmap-image";

interface ScreenPoint {
  x: number;
  y: number;
}

interface UseMindmapImagePasteParams {
  getNodes: () => Node[];
  setNodes: (updater: (current: Node[]) => Node[]) => void;
  screenToFlowPosition: (point: ScreenPoint) => ScreenPoint;
  takeSnapshot: () => void;
  canvasWrapperRef: RefObject<HTMLDivElement | null>;
}

/** Natural pixel size of an image file, or null if it can't be decoded. */
function readImageNaturalSize(file: File): Promise<ImageBox | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

/** Where to drop a pasted image: the last cursor spot over the canvas, or the
 * center of the visible canvas when the cursor was never over it. */
function dropPoint(
  pointer: ScreenPoint | null,
  wrapper: HTMLDivElement | null,
): ScreenPoint | null {
  if (pointer) {
    return pointer;
  }
  if (!wrapper) {
    return null;
  }
  const rect = wrapper.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

interface ImageNodeDeps {
  setNodes: (updater: (current: Node[]) => Node[]) => void;
  screenToFlowPosition: (point: ScreenPoint) => ScreenPoint;
  takeSnapshot: () => void;
}

function addImageNode(
  id: string,
  url: string | null,
  box: ImageBox,
  point: ScreenPoint,
  uploading: boolean,
  { setNodes, screenToFlowPosition, takeSnapshot }: ImageNodeDeps,
) {
  const center = screenToFlowPosition(point);
  // Drop centered on the cursor rather than top-left anchored to it.
  const position = {
    x: center.x - box.width / 2,
    y: center.y - box.height / 2,
  };
  takeSnapshot();
  setNodes((current) => [
    ...current.map((node) => ({ ...node, selected: false })),
    {
      id,
      type: "image",
      position,
      width: box.width,
      height: box.height,
      selected: true,
      data: {
        label: "",
        kind: "image" as const,
        ...(url ? { imageUrl: url } : {}),
        ...(uploading ? { uploading: true } : {}),
      },
    },
  ]);
}

interface PasteHandlerDeps {
  getNodes: () => Node[];
  setNodes: (updater: (current: Node[]) => Node[]) => void;
  screenToFlowPosition: (point: ScreenPoint) => ScreenPoint;
  takeSnapshot: () => void;
  canvasWrapperRef: RefObject<HTMLDivElement | null>;
  pointerRef: { current: ScreenPoint | null };
}

async function handleImagePaste(event: ClipboardEvent, deps: PasteHandlerDeps) {
  const {
    getNodes,
    setNodes,
    screenToFlowPosition,
    takeSnapshot,
    canvasWrapperRef,
    pointerRef,
  } = deps;
  const selectedNonImage = getNodes().some(
    (node) => node.selected && node.data.kind !== "image",
  );
  if (selectedNonImage) {
    return;
  }
  const file = getPastedImageFile(event);
  if (!file) {
    return;
  }
  event.preventDefault();
  const point = dropPoint(pointerRef.current, canvasWrapperRef.current);
  if (!point) {
    return;
  }
  const natural = await readImageNaturalSize(file);
  const box = natural
    ? scaleImageToBox(natural.width, natural.height, MINDMAP_IMAGE_MAX_SIZE)
    : {
        width: MINDMAP_IMAGE_DEFAULT_SIZE,
        height: MINDMAP_IMAGE_DEFAULT_SIZE,
      };
  // Create the placeholder node immediately so the user sees a loading
  // spinner on the canvas while the upload is in flight.
  const nodeId = crypto.randomUUID();
  addImageNode(nodeId, null, box, point, true, {
    setNodes,
    screenToFlowPosition,
    takeSnapshot,
  });
  const url = await uploadMindmapImage(file);
  if (!url) {
    // Upload failed or was rejected: remove the empty placeholder so the
    // canvas doesn't keep a broken, image-less node.
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    return;
  }
  setNodes((current) =>
    current.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: { ...node.data, imageUrl: url, uploading: undefined },
          }
        : node,
    ),
  );
}

/**
 * Paste an image from the clipboard onto empty mindmap canvas as a standalone,
 * resizable, connectable image node. Bails when a non-image node is selected so
 * the branch-node paste handler keeps attaching images into that node instead.
 *
 * @example
 * useMindmapImagePaste({ getNodes, setNodes, screenToFlowPosition, takeSnapshot, canvasWrapperRef });
 */
export function useMindmapImagePaste({
  getNodes,
  setNodes,
  screenToFlowPosition,
  takeSnapshot,
  canvasWrapperRef,
}: UseMindmapImagePasteParams): void {
  const pointerRef = useRef<ScreenPoint | null>(null);

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    wrapper?.addEventListener("pointermove", onPointerMove);
    return () => wrapper?.removeEventListener("pointermove", onPointerMove);
  }, [canvasWrapperRef]);

  useEffect(() => {
    const deps: PasteHandlerDeps = {
      getNodes,
      setNodes,
      screenToFlowPosition,
      takeSnapshot,
      canvasWrapperRef,
      pointerRef,
    };
    const onPaste = (event: ClipboardEvent) => handleImagePaste(event, deps);
    globalThis.addEventListener("paste", onPaste);
    return () => globalThis.removeEventListener("paste", onPaste);
  }, [
    getNodes,
    setNodes,
    screenToFlowPosition,
    takeSnapshot,
    canvasWrapperRef,
  ]);
}
