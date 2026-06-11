"use client";

import type { Node } from "@xyflow/react";
import { type RefObject, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { MindmapExporter } from "@/components/mindmaps/mindmap-canvas";
import {
  exportMindmapToPng,
  toPngFileName,
} from "@/features/mindmaps/export-png";

interface UseMindmapPngExportParams {
  /** Live nodes, watched so the measured-size signal can fire once. */
  nodes: Node[];
  getNodes: () => Node[];
  title: string;
  /** Wrapper around the ReactFlow viewport that gets rasterized. */
  canvasWrapperRef: RefObject<HTMLDivElement | null>;
  /** Populated with the live exporter for the out-of-provider kebab menu. */
  exportRef?: RefObject<MindmapExporter | null>;
  /** Fires once every node has a measured size (offscreen export waits on it). */
  onNodesMeasured?: () => void;
}

/**
 * Wires PNG export for the mindmap canvas: builds the live exporter, hands it to
 * the detail header's kebab menu through `exportRef`, and signals
 * `onNodesMeasured` once every node has real dimensions so an offscreen capture
 * frames the map correctly.
 *
 * @example
 * useMindmapPngExport({ nodes, getNodes, title, canvasWrapperRef, exportRef, onNodesMeasured });
 */
export function useMindmapPngExport({
  nodes,
  getNodes,
  title,
  canvasWrapperRef,
  exportRef,
  onNodesMeasured,
}: UseMindmapPngExportParams): void {
  const nodesMeasuredFiredRef = useRef(false);

  // Export the live canvas to a PNG. Reads `--background` at call time so the
  // image matches the active theme rather than a hardcoded color.
  const exportToPng = useCallback(async () => {
    const backgroundColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim() || "#ffffff";
    try {
      await exportMindmapToPng(
        getNodes(),
        toPngFileName(title),
        backgroundColor,
        canvasWrapperRef.current ?? document,
      );
      toast.success("Exported mindmap as PNG");
    } catch {
      toast.error("Couldn't export the mindmap");
    }
  }, [getNodes, title, canvasWrapperRef]);

  // Hand the exporter to the detail header's kebab menu, which lives outside the
  // ReactFlowProvider and so cannot read the live nodes itself.
  useEffect(() => {
    if (!exportRef) {
      return;
    }
    exportRef.current = exportToPng;
    return () => {
      if (exportRef.current === exportToPng) {
        exportRef.current = null;
      }
    };
  }, [exportRef, exportToPng]);

  // Tell the parent once every node carries a measured size; until then the
  // export framing math would see zero-sized nodes and crop the capture.
  useEffect(() => {
    if (!onNodesMeasured || nodesMeasuredFiredRef.current) {
      return;
    }
    const allMeasured =
      nodes.length > 0 &&
      nodes.every((node) => node.measured?.width && node.measured?.height);
    if (allMeasured) {
      nodesMeasuredFiredRef.current = true;
      onNodesMeasured();
    }
  }, [nodes, onNodesMeasured]);
}
