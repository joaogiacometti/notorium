"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type OcclusionRegion,
  type PixelRect,
  pixelRectToNormalized,
  regionToPixelRect,
} from "@/features/flashcards/occlusion";

// react-rnd touches the DOM on mount, so it must stay client-only.
const Rnd = dynamic(() => import("react-rnd").then((module) => module.Rnd), {
  ssr: false,
});

// Ignore stray clicks: a drag must cover at least this many pixels to mask.
const MIN_DRAW_PX = 6;

interface CanvasSize {
  width: number;
  height: number;
}

type RegionRect = Omit<OcclusionRegion, "id" | "label">;

interface OcclusionImageCanvasProps {
  imageUrl: string;
  regions: OcclusionRegion[];
  onRegionChange: (id: string, rect: RegionRect) => void;
  onRegionRemove: (id: string) => void;
  onRegionCreate: (rect: RegionRect) => void;
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}

/**
 * Renders the source image and its masks. New masks are drawn by dragging on
 * empty image space (RemNote-style); existing masks move and resize. Masks are
 * stored normalized (0..1) and projected to the rendered pixel size so they
 * stay aligned at any width.
 *
 * @example
 * <OcclusionImageCanvas imageUrl={url} regions={r} onRegionCreate={...} ... />
 */
export function OcclusionImageCanvas({
  imageUrl,
  regions,
  onRegionChange,
  onRegionRemove,
  onRegionCreate,
}: Readonly<OcclusionImageCanvasProps>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [draft, setDraft] = useState<PixelRect | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) {
      return;
    }
    const measure = () =>
      setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const ready = size.width > 0 && size.height > 0;

  function pointFromEvent(event: ReactPointerEvent): { x: number; y: number } {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) {
      return { x: 0, y: 0 };
    }
    return {
      x: clamp(event.clientX - bounds.left, size.width),
      y: clamp(event.clientY - bounds.top, size.height),
    };
  }

  function handleDrawStart(event: ReactPointerEvent) {
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    startRef.current = point;
    setDraft({ x: point.x, y: point.y, width: 0, height: 0 });
  }

  function handleDrawMove(event: ReactPointerEvent) {
    const start = startRef.current;
    if (!start) {
      return;
    }
    const point = pointFromEvent(event);
    setDraft({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  }

  function handleDrawEnd() {
    const finished = draft;
    startRef.current = null;
    setDraft(null);
    if (
      finished &&
      finished.width >= MIN_DRAW_PX &&
      finished.height >= MIN_DRAW_PX
    ) {
      onRegionCreate(pixelRectToNormalized(finished, size.width, size.height));
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block max-w-full select-none overflow-hidden rounded-md border border-border"
    >
      {/* biome-ignore lint/performance/noImgElement: blob route is auth-gated and not a Next static asset. */}
      <img
        src={imageUrl}
        alt="Occlusion source"
        className="block h-auto max-w-full select-none"
        draggable={false}
      />
      {ready ? (
        <div
          className="absolute inset-0 cursor-crosshair touch-none"
          onPointerDown={handleDrawStart}
          onPointerMove={handleDrawMove}
          onPointerUp={handleDrawEnd}
        />
      ) : null}
      {ready
        ? regions.map((region) => {
            const rect = regionToPixelRect(region, size.width, size.height);
            return (
              <Rnd
                key={region.id}
                bounds="parent"
                size={{ width: rect.width, height: rect.height }}
                position={{ x: rect.x, y: rect.y }}
                minWidth={10}
                minHeight={10}
                // Free the top-right corner so its resize handle does not
                // swallow clicks meant for the delete button anchored there.
                enableResizing={{
                  top: true,
                  right: true,
                  bottom: true,
                  left: true,
                  topRight: false,
                  topLeft: true,
                  bottomRight: true,
                  bottomLeft: true,
                }}
                onDragStop={(_event, data) =>
                  onRegionChange(
                    region.id,
                    pixelRectToNormalized(
                      {
                        x: data.x,
                        y: data.y,
                        width: rect.width,
                        height: rect.height,
                      },
                      size.width,
                      size.height,
                    ),
                  )
                }
                onResizeStop={(_event, _direction, ref, _delta, position) =>
                  onRegionChange(
                    region.id,
                    pixelRectToNormalized(
                      {
                        x: position.x,
                        y: position.y,
                        width: ref.offsetWidth,
                        height: ref.offsetHeight,
                      },
                      size.width,
                      size.height,
                    ),
                  )
                }
                className="group !absolute"
              >
                <div className="size-full rounded-[2px] border border-(--primary) bg-(--primary)/70">
                  <button
                    type="button"
                    aria-label="Remove mask"
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onRegionRemove(region.id)}
                    className="absolute -top-2 -right-2 z-30 flex size-5 items-center justify-center rounded-full bg-(--destructive) text-(--primary-foreground) opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </Rnd>
            );
          })
        : null}
      {draft ? (
        <div
          className="pointer-events-none absolute rounded-[2px] border-2 border-(--primary) border-dashed bg-(--primary)/30"
          style={{
            left: draft.x,
            top: draft.y,
            width: draft.width,
            height: draft.height,
          }}
        />
      ) : null}
    </div>
  );
}
