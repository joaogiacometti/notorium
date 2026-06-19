import { cn } from "@/lib/utils";

export interface SubjectTreeRootDropZoneProps {
  isActive: boolean;
  onDragTarget: () => void;
  onDropTarget: () => void;
}

/** Drop strip shown while dragging; dropping here moves a subject to the top level. */
export function SubjectTreeRootDropZone({
  isActive,
  onDragTarget,
  onDropTarget,
}: Readonly<SubjectTreeRootDropZoneProps>) {
  return (
    <button
      type="button"
      onDragOver={(event) => {
        event.preventDefault();
        onDragTarget();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDropTarget();
      }}
      className={cn(
        "mb-1 w-full rounded-md border border-dashed px-2 py-1.5 text-center text-[11px] transition-colors",
        isActive
          ? "border-[color:var(--intent-info-border)] bg-background text-foreground"
          : "border-border/70 text-muted-foreground",
      )}
    >
      Move to top level
    </button>
  );
}
