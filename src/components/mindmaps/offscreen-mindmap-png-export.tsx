"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getMindmapById } from "@/app/actions/mindmaps";
import { LazyMindmapCanvas } from "@/components/mindmaps/lazy-mindmap-canvas";
import type { MindmapExporter } from "@/components/mindmaps/mindmap-canvas";
import type { MindmapGraph } from "@/features/mindmaps/types";
import { ensureRootNode, parseMindmapGraph } from "@/features/mindmaps/utils";

interface OffscreenMindmapPngExportProps {
  mindmapId: string;
  onDone: () => void;
}

interface LoadedMindmap {
  title: string;
  graph: MindmapGraph;
}

// Node heights settle once their images finish loading; give them a beat
// after measurement before capturing so the framed bounds are final.
const IMAGE_SETTLE_DELAY_MS = 500;

/**
 * Exports a mindmap that is not currently open: fetches it, renders its canvas
 * in an offscreen container, waits for node measurement, then downloads the
 * PNG and calls `onDone`. Mount it only while an export is in flight.
 *
 * @example
 * {exportId ? <OffscreenMindmapPngExport mindmapId={exportId} onDone={() => setExportId(null)} /> : null}
 */
export function OffscreenMindmapPngExport({
  mindmapId,
  onDone,
}: Readonly<OffscreenMindmapPngExportProps>) {
  const [loaded, setLoaded] = useState<LoadedMindmap | null>(null);
  const exportRef = useRef<MindmapExporter | null>(null);
  const hasExportedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void getMindmapById(mindmapId).then((mindmap) => {
      if (cancelled) {
        return;
      }
      if (!mindmap) {
        toast.error("Couldn't load the mindmap to export");
        onDone();
        return;
      }
      setLoaded({
        title: mindmap.title,
        graph: ensureRootNode(parseMindmapGraph(mindmap.data), mindmap.title),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [mindmapId, onDone]);

  function exportAfterImagesSettle() {
    setTimeout(() => {
      if (hasExportedRef.current) {
        return;
      }
      hasExportedRef.current = true;
      // The canvas exporter already toasts success/failure itself.
      void Promise.resolve(exportRef.current?.()).finally(onDone);
    }, IMAGE_SETTLE_DELAY_MS);
  }

  if (!loaded) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 -left-[200vw] h-[800px] w-[1200px] overflow-hidden"
    >
      <LazyMindmapCanvas
        initialGraph={loaded.graph}
        title={loaded.title}
        onTitleChange={() => {}}
        onGraphChange={() => {}}
        exportRef={exportRef}
        shortcutsEnabled={false}
        onNodesMeasured={exportAfterImagesSettle}
      />
    </div>
  );
}
