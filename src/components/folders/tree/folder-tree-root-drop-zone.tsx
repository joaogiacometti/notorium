import { cn } from "@/lib/utils";

export interface FolderTreeRootDropZoneProps {
  isActive: boolean;
  onDragTarget: () => void;
  onDropTarget: () => void;
}

/** Drop strip shown while dragging; dropping here moves a folder to the top level. */
export function FolderTreeRootDropZone({
  isActive,
  onDragTarget,
  onDropTarget,
}: Readonly<FolderTreeRootDropZoneProps>) {
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
        "mb-1 w-full rounded-md border border-dashed px-2 py-1.5 text-center text-xs transition-colors",
        isActive
          ? "border-primary/60 bg-primary/5 text-foreground"
          : "border-border text-muted-foreground",
      )}
    >
      Move to top level
    </button>
  );
}
