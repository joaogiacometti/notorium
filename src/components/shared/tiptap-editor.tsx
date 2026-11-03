"use client";

import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  type LinkDialogState,
  LinkEditDialog,
  prepareLinkDialogState,
} from "@/components/shared/link-edit-dialog";
import {
  type MathDialogState,
  MathEditDialog,
} from "@/components/shared/math-edit-dialog";
import {
  NoteLinkPicker,
  useNoteLinkPicker,
} from "@/components/shared/note-link-picker";
import {
  EDITOR_ROOT_ATTRIBUTE,
  focusToolbarOnShortcut,
  TiptapFormattingToolbar,
} from "@/components/shared/tiptap-formatting-toolbar";
import {
  createImageUrlPasteExtension,
  type EditorImageUploadContext,
  type EditorImageUploadTracker,
  uploadPastedImage,
} from "@/components/shared/tiptap-helpers";
import { TiptapTableControls } from "@/components/shared/tiptap-table-controls";
import {
  documentFromJSON,
  documentsEqual,
  type RichTextDocument,
} from "@/lib/editor/document";
import { buildDocumentExtensions } from "@/lib/editor/document-extensions";
import { DocumentTitleHistory } from "@/lib/editor/document-title-history";
import { shouldSubmitEditorOnCtrlEnter } from "@/lib/editor/editor-submit-shortcuts";
import {
  createNoteLinkTargetStore,
  EditableNoteLink,
} from "@/lib/editor/tiptap-editable-note-link";
import { NoteLinkSuggestion } from "@/lib/editor/tiptap-note-link-suggestion";
import { SlashCommands } from "@/lib/editor/tiptap-slash-commands";
import type { NoteConnections } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

/** Note link behavior for editors of a saved note. */
interface EditorNoteLinks {
  /** The note being edited, which the `[[` picker leaves out. */
  sourceNoteId: string;
  /** Current titles and missing targets; saved titles show until they load. */
  targets: NoteConnections | null;
  navigate: (href: string) => void;
}

/** What a toolbar outside the editor needs to drive it. */
export interface EditorToolbarTarget {
  editor: Editor;
  imageUploadPending: boolean;
  onEditLink: () => void;
  onSelectImage: () => void;
}

interface TiptapEditorProps {
  onEditorReady?: (editor: Editor | null) => void;
  /**
   * Hands the formatting controls to a toolbar the parent renders (one toolbar
   * for several fields). The editor then draws no border or toolbar of its own;
   * it reports null when it unmounts.
   */
  onToolbarTargetChange?: (target: EditorToolbarTarget | null) => void;
  onFocus?: () => void;
  value: RichTextDocument;
  onChange: (value: RichTextDocument) => void;
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  className?: string;
  contentClassName?: string;
  imageUploadContext?: EditorImageUploadContext;
  onCtrlEnter?: () => void;
  onImageUploadPendingChange?: (pending: boolean) => void;
  /** Enables the `[[` note link picker and live link titles. */
  noteLinks?: EditorNoteLinks;
}

export function TiptapEditor({
  value,
  onEditorReady,
  onChange,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  className,
  contentClassName,
  imageUploadContext = "notes",
  onCtrlEnter,
  onImageUploadPendingChange,
  onToolbarTargetChange,
  onFocus,
  noteLinks,
}: Readonly<TiptapEditorProps>) {
  const noteLinkPicker = useNoteLinkPicker();
  const [noteLinkTargets] = useState(createNoteLinkTargetStore);
  const noteLinkTargetData = noteLinks?.targets ?? null;
  const navigateNoteLinkRef = useRef(noteLinks?.navigate);
  navigateNoteLinkRef.current = noteLinks?.navigate;
  const resolvedPlaceholder = placeholder ?? "Start writing your notes...";
  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;
  const onToolbarTargetChangeRef = useRef(onToolbarTargetChange);
  onToolbarTargetChangeRef.current = onToolbarTargetChange;
  const bare = onToolbarTargetChange !== undefined;
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const onCtrlEnterRef = useRef(onCtrlEnter);
  const onImageUploadPendingChangeRef = useRef(onImageUploadPendingChange);
  const activeUploadsRef = useRef(0);
  const [isImageUploadPending, setIsImageUploadPending] = useState(false);
  const [mathDialog, setMathDialog] = useState<MathDialogState | null>(null);
  const [linkDialog, setLinkDialog] = useState<LinkDialogState | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  onCtrlEnterRef.current = onCtrlEnter;
  onImageUploadPendingChangeRef.current = onImageUploadPendingChange;

  const imageUploadTracker: EditorImageUploadTracker = {
    start: () => {
      activeUploadsRef.current += 1;
      if (activeUploadsRef.current === 1) {
        setIsImageUploadPending(true);
      }
    },
    finish: () => {
      activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
      if (activeUploadsRef.current === 0) {
        setIsImageUploadPending(false);
      }
    },
  };

  const handleUpdate = ({
    editor,
    transaction,
  }: {
    editor: Editor;
    transaction: import("@tiptap/pm/state").Transaction;
  }) => {
    // Title history changes document attributes, not the persisted body.
    if (transaction.before.content.eq(transaction.doc.content)) return;
    onChange(documentFromJSON(editor.getJSON()));
  };

  const editor = useEditor({
    extensions: [
      DocumentTitleHistory,
      ...buildDocumentExtensions({
        editable: true,
        noteLink: EditableNoteLink.configure({
          targets: noteLinkTargets,
          navigate: noteLinks
            ? (href) => navigateNoteLinkRef.current?.(href)
            : null,
        }),
        math: {
          onClickMath: (target) =>
            setMathDialog({
              mode: "edit",
              nodeType: target.type,
              pos: target.pos,
              latex: target.latex,
            }),
        },
      }),
      Placeholder.configure({ placeholder: resolvedPlaceholder }),
      Typography,
      SlashCommands.configure({
        onRequestBlockMath: (range) =>
          setMathDialog({ mode: "insert-block", range }),
      }),
      createImageUrlPasteExtension(
        imageUploadContext,
        () => activeUploadsRef.current > 0,
        imageUploadTracker,
      ),
      ...(noteLinks
        ? [NoteLinkSuggestion.configure({ render: noteLinkPicker.render })]
        : []),
    ],
    content: value,
    onUpdate: handleUpdate,
    onFocus: () => onFocusRef.current?.(),
    editorProps: {
      attributes: {
        id: id ?? "",
        "aria-invalid": ariaInvalid ? "true" : "false",
        class: "tiptap-editor-content",
      },
      handleKeyDown: (view, event) => {
        if (focusToolbarOnShortcut(event, view.dom)) return true;
        if (
          event.key === "k" &&
          (event.metaKey || event.ctrlKey) &&
          !event.shiftKey
        ) {
          const ed = editorRef.current;
          if (!ed) return false;
          event.preventDefault();
          event.stopPropagation();
          setLinkDialog(prepareLinkDialogState(ed));
          return true;
        }

        if (
          !onCtrlEnterRef.current ||
          !shouldSubmitEditorOnCtrlEnter({
            key: event.key,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
          })
        ) {
          return false;
        }

        event.preventDefault();
        onCtrlEnterRef.current();
        return true;
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    noteLinkTargets.set(noteLinkTargetData);
  }, [noteLinkTargets, noteLinkTargetData]);

  useEffect(() => {
    editorRef.current = editor;
    onEditorReadyRef.current?.(editor);
    return () => onEditorReadyRef.current?.(null);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const currentDocument = documentFromJSON(editor.getJSON());
    if (!documentsEqual(value, currentDocument)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    onImageUploadPendingChangeRef.current?.(isImageUploadPending);
  }, [isImageUploadPending]);

  useEffect(() => {
    if (!editor) return;
    onToolbarTargetChangeRef.current?.({
      editor,
      imageUploadPending: isImageUploadPending,
      onEditLink: () => setLinkDialog(prepareLinkDialogState(editor)),
      onSelectImage: () => imageInputRef.current?.click(),
    });
  }, [editor, isImageUploadPending]);

  useEffect(() => () => onToolbarTargetChangeRef.current?.(null), []);

  useEffect(() => {
    return () => {
      if (activeUploadsRef.current > 0) {
        onImageUploadPendingChangeRef.current?.(false);
      }
    };
  }, []);

  return (
    <div
      {...(bare ? {} : { [EDITOR_ROOT_ATTRIBUTE]: "" })}
      className={cn(
        "w-full min-w-0",
        !bare &&
          "rounded-md border border-input transition-colors focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        !bare &&
          ariaInvalid &&
          "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
        className,
      )}
    >
      {isImageUploadPending ? (
        <div
          className={cn(
            "flex items-center gap-2 text-sm text-muted-foreground",
            bare ? "pb-2" : "border-b px-3 py-2",
          )}
        >
          <Loader2 className="size-4 animate-spin" />
          <span>Uploading image...</span>
        </div>
      ) : null}
      {editor && !bare ? (
        <TiptapFormattingToolbar
          editor={editor}
          imageUploadPending={isImageUploadPending}
          onEditLink={() => setLinkDialog(prepareLinkDialogState(editor))}
          onSelectImage={() => imageInputRef.current?.click()}
        />
      ) : null}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Choose editor image"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (editor && file) {
            void uploadPastedImage(
              editor,
              file,
              imageUploadContext,
              imageUploadTracker,
            );
          }
        }}
      />
      {editor ? <TiptapTableControls editor={editor} /> : null}
      <EditorContent
        editor={editor}
        className={cn(
          "tiptap-wrapper min-h-52 max-h-[52svh] overflow-y-auto",
          bare && "tiptap-bare",
          contentClassName,
        )}
      />
      <MathEditDialog
        editor={editor}
        state={mathDialog}
        onClose={() => setMathDialog(null)}
      />
      <LinkEditDialog
        editor={editor}
        state={linkDialog}
        onClose={() => setLinkDialog(null)}
      />
      {noteLinks && noteLinkPicker.session ? (
        <NoteLinkPicker
          session={noteLinkPicker.session}
          currentNoteId={noteLinks.sourceNoteId}
          keyHandlerRef={noteLinkPicker.keyHandlerRef}
          onDismiss={noteLinkPicker.dismiss}
        />
      ) : null}
    </div>
  );
}
