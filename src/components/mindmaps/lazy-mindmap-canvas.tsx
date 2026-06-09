"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { MindmapCanvas as MindmapCanvasType } from "@/components/mindmaps/mindmap-canvas";

type LazyMindmapCanvasProps = ComponentProps<typeof MindmapCanvasType>;

// React Flow is browser-only; load it client-side like the Tiptap editor.
export const LazyMindmapCanvas = dynamic<LazyMindmapCanvasProps>(
  () =>
    import("@/components/mindmaps/mindmap-canvas").then((m) => m.MindmapCanvas),
  { ssr: false },
);
