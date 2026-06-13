"use client";

import type { OcclusionRegion } from "@/features/flashcards/occlusion";
import { cn } from "@/lib/utils";

interface OcclusionCardFaceProps {
  imagePathname: string;
  regions: OcclusionRegion[];
  testedMaskId: string | null;
  /** When true the tested mask is uncovered (the answer side of the card). */
  revealed: boolean;
  className?: string;
}

function blobUrl(pathname: string): string {
  return `/api/attachments/blob?pathname=${encodeURIComponent(pathname)}`;
}

function percent(value: number): string {
  return `${value * 100}%`;
}

/**
 * Renders an image occlusion card face: the source image with every mask
 * covered ("hide all, guess one"). The tested mask is highlighted as the prompt
 * and is uncovered once `revealed`.
 *
 * @example
 * <OcclusionCardFace imagePathname={p} regions={r} testedMaskId="m1" revealed />
 */
export function OcclusionCardFace({
  imagePathname,
  regions,
  testedMaskId,
  revealed,
  className,
}: Readonly<OcclusionCardFaceProps>) {
  return (
    <div className={cn("relative inline-block max-w-full", className)}>
      {/* biome-ignore lint/performance/noImgElement: blob route is auth-gated and not a Next static asset. */}
      <img
        src={blobUrl(imagePathname)}
        alt="Occlusion card"
        className="block h-auto max-w-full rounded-md select-none"
        draggable={false}
      />
      {regions.map((region) => (
        <OcclusionMask
          key={region.id}
          region={region}
          isTested={region.id === testedMaskId}
          revealed={revealed}
        />
      ))}
    </div>
  );
}

interface OcclusionMaskProps {
  region: OcclusionRegion;
  isTested: boolean;
  revealed: boolean;
}

function OcclusionMask({
  region,
  isTested,
  revealed,
}: Readonly<OcclusionMaskProps>) {
  // The tested mask uncovers on the answer side; others always stay covered.
  // Hidden regions read as light "blank fields"; the active region is the one
  // solid-accent box, so it stands out without motion or markers (RemNote-style).
  const uncovered = isTested && revealed;
  return (
    <div
      className={cn(
        "absolute flex items-center justify-center overflow-hidden rounded-sm",
        uncovered
          ? "border-2 border-(--primary) bg-transparent"
          : isTested
            ? "border-2 border-(--primary) bg-(--primary)"
            : "border border-(--border) bg-(--muted)",
      )}
      style={{
        left: percent(region.x),
        top: percent(region.y),
        width: percent(region.width),
        height: percent(region.height),
      }}
    >
      {isTested && !uncovered ? (
        <span className="text-xs font-bold text-(--primary-foreground)">?</span>
      ) : null}
    </div>
  );
}
