"use client";

import {
  type NodeProps,
  NodeToolbar,
  Position,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import {
  Bold,
  ImageIcon,
  Italic,
  Loader2,
  Scissors,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMindmapActions } from "@/components/mindmaps/mindmap-actions-context";
import { MindmapAddButtons } from "@/components/mindmaps/mindmap-add-buttons";
import { MindmapHandles } from "@/components/mindmaps/mindmap-handles";
import { MindmapToolbarButton } from "@/components/mindmaps/mindmap-toolbar-button";
import { SUPPORTED_ATTACHMENT_IMAGE_MIME_TYPES } from "@/features/attachments/validation";
import { MINDMAP_NODE_COLOR_TOKENS } from "@/features/mindmaps/constants";
import type { MindmapNode } from "@/features/mindmaps/types";
import { LIMITS } from "@/lib/config/limits";
import { getPastedImageFile } from "@/lib/editor/clipboard-image";
import {
  shouldKeepMindmapEditorAfterBlur,
  useMindmapWindowFocusRestore,
} from "@/lib/mindmap/edit-focus";
import {
  firstSelectedNodeId,
  selectedNodeCount,
} from "@/lib/mindmap/selection-store";
import { uploadMindmapImage } from "@/lib/mindmap/upload-mindmap-image";
import { cn } from "@/lib/utils";

const IMAGE_ACCEPT = SUPPORTED_ATTACHMENT_IMAGE_MIME_TYPES.join(",");

type MindmapNodeData = MindmapNode["data"];

function focusLabelTextarea(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }
  element.focus();
  element.select();
}

/**
 * Manages image upload, paste-to-attach, and the hidden file input for a single
 * mindmap node. Keeps the upload state and clipboard listener self-contained so
 * the main node component stays focused on layout.
 */
function useMindmapNodeImage(
  id: string,
  selected: boolean,
  isMultiSelect: boolean,
) {
  const actions = useMindmapActions();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const url = await uploadMindmapImage(file);
        if (url) {
          actions.setNodeImage(id, url);
        }
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
    globalThis.addEventListener("paste", onPaste);
    return () => globalThis.removeEventListener("paste", onPaste);
  }, [selected, isMultiSelect, uploading, uploadImage]);

  return { uploading, fileInputRef, uploadImage } as const;
}

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
  const { uploading, fileInputRef, uploadImage } = useMindmapNodeImage(
    id,
    selected,
    isMultiSelect,
  );
  const [editing, setEditing] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colorVar = data.color ? `var(--${data.color})` : undefined;
  // Transient flag set by the canvas while a node is dragged over this one, so
  // the user sees where a re-parenting drop will land. Not persisted.
  const isDropTarget =
    (data as MindmapNodeData & { dropTarget?: boolean }).dropTarget === true;

  // Newly created nodes open straight into edit mode so the user can type.
  useEffect(() => {
    if (actions.consumePendingEdit(id)) {
      setEditing(true);
    }
  }, [id, actions]);

  useEffect(() => {
    if (!selected || isMultiSelect || editing) {
      return;
    }
    const onPaste = (event: ClipboardEvent) => {
      if (getPastedImageFile(event)) {
        return;
      }
      const pastedText = event.clipboardData?.getData("text/plain") ?? "";
      const text = pastedText.slice(0, LIMITS.mindmapNodeLabelMax);
      if (!text) {
        return;
      }
      event.preventDefault();
      updateNodeData(id, { label: text });
    };
    globalThis.addEventListener("paste", onPaste);
    return () => globalThis.removeEventListener("paste", onPaste);
  }, [id, selected, isMultiSelect, editing, updateNodeData]);

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
    const timeoutId = window.setTimeout(() => {
      resize();
      focusLabelTextarea(textareaRef.current);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [editing, resize]);
  useMindmapWindowFocusRestore(editing, textareaRef);

  let imageSection: React.ReactNode = null;
  if (data.imageUrl) {
    imageSection = (
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
    );
  } else if (uploading) {
    imageSection = (
      <div className="mb-2 flex h-32 items-center justify-center rounded border border-dashed border-border bg-muted/30">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  let boxShadow: string | undefined;
  if (isDropTarget) {
    boxShadow =
      "0 0 0 3px var(--primary), 0 0 0 7px color-mix(in oklab, var(--primary) 35%, transparent)";
  } else if (selected) {
    boxShadow = "0 0 0 2px var(--primary)";
  }

  return (
    <div
      className="w-48 rounded-md border bg-card px-3 py-2 text-sm text-card-foreground shadow-sm"
      style={{
        borderColor: colorVar ?? "var(--border)",
        borderWidth: 1,
        boxShadow,
        ...(colorVar
          ? { background: `color-mix(in oklab, ${colorVar} 12%, var(--card))` }
          : {}),
      }}
    >
      <NodeToolbar isVisible={showToolbar} position={Position.Top}>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-md">
          <MindmapToolbarButton
            label="Bold"
            active={Boolean(data.bold)}
            onClick={() => actions.toggleNodeStyle(id, "bold")}
          >
            <Bold className="size-4" />
          </MindmapToolbarButton>
          <MindmapToolbarButton
            label="Italic"
            active={Boolean(data.italic)}
            onClick={() => actions.toggleNodeStyle(id, "italic")}
          >
            <Italic className="size-4" />
          </MindmapToolbarButton>
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
          <NodeImageButton
            visible={!isMultiSelect}
            uploading={uploading}
            imageUrl={data.imageUrl}
            onClick={() => fileInputRef.current?.click()}
          />
          {!isMultiSelect ? (
            <MindmapToolbarButton
              label="Break into new mindmap"
              disabled={splitting}
              onClick={() => {
                setSplitting(true);
                void actions.splitIntoMindmap(id).finally(() => {
                  setSplitting(false);
                });
              }}
            >
              {splitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Scissors className="size-4" />
              )}
            </MindmapToolbarButton>
          ) : null}
          <MindmapToolbarButton
            label="Delete node"
            destructive
            onClick={() => actions.deleteNode(id)}
          >
            <Trash2 className="size-4" />
          </MindmapToolbarButton>
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
      {imageSection}
      <NodeLabel
        editing={editing}
        label={data.label}
        bold={Boolean(data.bold)}
        italic={Boolean(data.italic)}
        textareaRef={textareaRef}
        onEditorMount={focusLabelTextarea}
        onEditStart={() => setEditing(true)}
        onEditEnd={() => setEditing(false)}
        onChange={(value) => {
          updateNodeData(id, { label: value });
          resize();
        }}
      />
    </div>
  );
}

interface NodeImageButtonProps {
  visible: boolean;
  uploading: boolean;
  imageUrl: string | undefined | null;
  onClick: () => void;
}

/** Toolbar button for attaching or replacing a node image. Returns null when
 *  hidden by multi-select so the main component avoids conditional rendering. */
function NodeImageButton({
  visible,
  uploading,
  imageUrl,
  onClick,
}: Readonly<NodeImageButtonProps>) {
  if (!visible) {
    return null;
  }
  return (
    <MindmapToolbarButton
      label={imageUrl ? "Replace image" : "Add image"}
      onClick={onClick}
    >
      {uploading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ImageIcon className="size-4" />
      )}
    </MindmapToolbarButton>
  );
}

interface NodeLabelProps {
  editing: boolean;
  label: string;
  bold: boolean;
  italic: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onEditorMount: (element: HTMLTextAreaElement | null) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onChange: (value: string) => void;
}

/** Editable node label. Switches between a read-only button (double-click to
 *  edit) and an auto-resizing textarea. Keeps edit-mode conditionals out of
 *  the parent component. */
function NodeLabel({
  editing,
  label,
  bold,
  italic,
  textareaRef,
  onEditorMount,
  onEditStart,
  onEditEnd,
  onChange,
}: Readonly<NodeLabelProps>) {
  const setTextareaRef = useCallback(
    (element: HTMLTextAreaElement | null) => {
      textareaRef.current = element;
      if (element) {
        onEditorMount(element);
      }
    },
    [textareaRef, onEditorMount],
  );
  const displayClass = cn(
    "block w-full whitespace-pre-wrap break-words text-left",
    bold && "font-bold",
    italic && "italic",
  );

  if (!editing) {
    return (
      <button
        type="button"
        onDoubleClick={onEditStart}
        className={displayClass}
      >
        {label || "Untitled"}
      </button>
    );
  }

  return (
    <textarea
      ref={setTextareaRef}
      rows={1}
      value={label}
      maxLength={LIMITS.mindmapNodeLabelMax}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        if (shouldKeepMindmapEditorAfterBlur()) {
          return;
        }
        onEditEnd();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onEditEnd();
        }
      }}
      aria-label="Node label"
      className={cn(
        "nodrag block w-full resize-none overflow-hidden break-words bg-transparent outline-none",
        bold && "font-bold",
        italic && "italic",
      )}
    />
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
