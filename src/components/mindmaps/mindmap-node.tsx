"use client";

import {
  type NodeProps,
  NodeToolbar,
  Position,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import { Bold, ImageIcon, Italic, Loader2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadEditorImage } from "@/app/actions/attachments";
import { useMindmapActions } from "@/components/mindmaps/mindmap-actions-context";
import { MindmapAddButtons } from "@/components/mindmaps/mindmap-add-buttons";
import { MindmapHandles } from "@/components/mindmaps/mindmap-handles";
import { SUPPORTED_ATTACHMENT_IMAGE_MIME_TYPES } from "@/features/attachments/validation";
import { MINDMAP_NODE_COLOR_TOKENS } from "@/features/mindmaps/constants";
import type { MindmapNode } from "@/features/mindmaps/types";
import { LIMITS } from "@/lib/config/limits";
import {
  getPastedImageFile,
  getPastedImageFileName,
} from "@/lib/editor/clipboard-image";
import {
  shouldKeepMindmapEditorAfterBlur,
  useMindmapWindowFocusRestore,
} from "@/lib/mindmap/edit-focus";
import {
  firstSelectedNodeId,
  selectedNodeCount,
} from "@/lib/mindmap/selection-store";
import { t } from "@/lib/server/server-action-errors";
import { cn, readFileAsBase64 } from "@/lib/utils";

const IMAGE_ACCEPT = SUPPORTED_ATTACHMENT_IMAGE_MIME_TYPES.join(",");

type MindmapNodeData = MindmapNode["data"];

/**
 * Editable mindmap branch node. Single click/drag moves the node; double click
 * edits the label. When selected, a floating toolbar (React Flow `NodeToolbar`)
 * exposes bold/italic, a color picker, an add-child action, and delete.
 */
export function MindmapNodeComponent({
  id,
  data,
  selected,
}: Readonly<NodeProps & { data: MindmapNodeData }>) {
  const { updateNodeData } = useReactFlow();
  const actions = useMindmapActions();
  const selectedCount = useStore(selectedNodeCount);
  const isToolbarAnchor = useStore(
    (state) => firstSelectedNodeId(state) === id,
  );
  // With several nodes selected, show one shared toolbar (on the anchor) instead
  // of a duplicate menu per node. Add-child and image are single-node only.
  const isMultiSelect = selectedCount > 1;
  const showToolbar = Boolean(selected) && (!isMultiSelect || isToolbarAnchor);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorVar = data.color ? `var(--${data.color})` : undefined;
  // Transient flag set by the canvas while a node is dragged over this one, so
  // the user sees where a re-parenting drop will land. Not persisted.
  const isDropTarget =
    (data as MindmapNodeData & { dropTarget?: boolean }).dropTarget === true;

  const uploadImage = useCallback(
    async (file: File) => {
      if (file.size > LIMITS.attachmentMaxBytes) {
        toast.error(
          t("limits.attachmentSizeLimit", { max: LIMITS.attachmentMaxBytes }),
        );
        return;
      }
      setUploading(true);
      try {
        const dataBase64 = await readFileAsBase64(file);
        if (!dataBase64) {
          toast.error(t("attachments.uploadFailed"));
          return;
        }
        const result = await uploadEditorImage({
          fileName: getPastedImageFileName(file),
          mimeType: file.type,
          dataBase64,
          context: "mindmaps",
        });
        if (!result.success) {
          toast.error(t(result.errorCode, result.errorParams));
          return;
        }
        actions.setNodeImage(id, result.url);
      } finally {
        setUploading(false);
      }
    },
    [actions, id],
  );

  // Ctrl/Cmd+V with an image in the clipboard attaches it to the single
  // selected node, mirroring the toolbar attach button. Text pastes are left
  // alone so label editing keeps its normal paste behavior.
  useEffect(() => {
    if (!selected || isMultiSelect || uploading) {
      return;
    }
    const onPaste = (event: ClipboardEvent) => {
      const file = getPastedImageFile(event);
      if (!file) {
        return;
      }
      event.preventDefault();
      void uploadImage(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [selected, isMultiSelect, uploading, uploadImage]);

  // Newly created nodes open straight into edit mode so the user can type.
  useEffect(() => {
    if (actions.consumePendingEdit(id)) {
      setEditing(true);
    }
  }, [id, actions]);

  const resize = useCallback(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (!editing) {
      return;
    }
    resize();
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, [editing, resize]);
  useMindmapWindowFocusRestore(editing, textareaRef);

  const labelClass = cn(
    "block w-full whitespace-pre-wrap break-words text-left",
    data.bold && "font-bold",
    data.italic && "italic",
  );

  return (
    <div
      className="w-48 rounded-md border bg-(--card) px-3 py-2 text-sm text-(--card-foreground) shadow-sm"
      style={{
        borderColor: colorVar ?? "var(--border)",
        borderWidth: 1,
        boxShadow: isDropTarget
          ? "0 0 0 3px var(--primary), 0 0 0 7px color-mix(in oklab, var(--primary) 35%, transparent)"
          : selected
            ? "0 0 0 2px var(--primary)"
            : undefined,
        ...(colorVar
          ? { background: `color-mix(in oklab, ${colorVar} 12%, var(--card))` }
          : {}),
      }}
    >
      <NodeToolbar isVisible={showToolbar} position={Position.Top}>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-md">
          <ToolbarButton
            label="Bold"
            active={Boolean(data.bold)}
            onClick={() => actions.toggleNodeStyle(id, "bold")}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={Boolean(data.italic)}
            onClick={() => actions.toggleNodeStyle(id, "italic")}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <div className="mx-0.5 h-5 w-px bg-border" />
          <ColorSwatch
            label="Default color"
            active={!data.color}
            onClick={() => actions.setNodeColor(id, null)}
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          />
          {MINDMAP_NODE_COLOR_TOKENS.map((token) => (
            <ColorSwatch
              key={token}
              label={token}
              active={data.color === token}
              onClick={() => actions.setNodeColor(id, token)}
              style={{ background: `var(--${token})` }}
            />
          ))}
          <div className="mx-0.5 h-5 w-px bg-border" />
          {isMultiSelect ? null : (
            <ToolbarButton
              label={data.imageUrl ? "Replace image" : "Add image"}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImageIcon className="size-4" />
              )}
            </ToolbarButton>
          )}
          <ToolbarButton
            label="Delete node"
            destructive
            onClick={() => actions.deleteNode(id)}
          >
            <Trash2 className="size-4" />
          </ToolbarButton>
        </div>
      </NodeToolbar>
      <MindmapAddButtons
        nodeId={id}
        visible={Boolean(selected) && !isMultiSelect}
        allowedSides={actions.getAllowedChildSides(id)}
      />

      <MindmapHandles />
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            void uploadImage(file);
          }
        }}
      />
      {data.imageUrl ? (
        <div className="relative mb-2">
          {/* biome-ignore lint/performance/noImgElement: node images are user uploads served from our own attachment endpoint; next/image optimization does not apply */}
          <img
            src={data.imageUrl}
            alt=""
            className="max-h-32 w-full rounded object-cover"
          />
          {selected ? (
            <button
              type="button"
              onClick={() => actions.setNodeImage(id, null)}
              aria-label="Remove image"
              title="Remove image"
              className="nodrag absolute right-1 top-1 flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
      ) : null}
      {editing ? (
        <textarea
          ref={textareaRef}
          rows={1}
          value={data.label}
          onChange={(event) => {
            updateNodeData(id, { label: event.target.value });
            resize();
          }}
          onBlur={() => {
            if (shouldKeepMindmapEditorAfterBlur()) {
              return;
            }
            setEditing(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              setEditing(false);
            }
          }}
          aria-label="Node label"
          className={cn(
            "nodrag block w-full resize-none overflow-hidden break-words bg-transparent outline-none",
            data.bold && "font-bold",
            data.italic && "italic",
          )}
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => setEditing(true)}
          className={labelClass}
        >
          {data.label || "Untitled"}
        </button>
      )}
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({
  label,
  active,
  destructive,
  onClick,
  children,
}: Readonly<ToolbarButtonProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

interface ColorSwatchProps {
  label: string;
  active: boolean;
  onClick: () => void;
  style: React.CSSProperties;
}

function ColorSwatch({
  label,
  active,
  onClick,
  style,
}: Readonly<ColorSwatchProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      style={style}
      className={cn(
        "size-5 rounded-full border-2 transition-transform hover:scale-110",
        active ? "border-foreground" : "border-transparent",
      )}
    />
  );
}
