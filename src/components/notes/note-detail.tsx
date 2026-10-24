"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { Editor } from "@tiptap/core";
import { Clipboard, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editNote } from "@/app/actions/notes";
import { AssistantSurfaceHost } from "@/components/assistant/assistant-surface-host";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { buildDocumentContext } from "@/components/assistant/study-context-content";
import { useActiveNoteEditor } from "@/components/assistant/use-active-note-editor";
import { useStudyContext } from "@/components/assistant/use-study-context";
import { DocumentAutosaveFeedback } from "@/components/documents/document-autosave-feedback";
import { DocumentTitleReview } from "@/components/documents/document-title-review";
import { ZenModeToggle } from "@/components/documents/zen-mode-toggle";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { NoteDocumentReview } from "@/components/notes/note-document-review";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import { PageTopBar } from "@/components/shared/page-top-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type EditNoteForm, editNoteSchema } from "@/features/notes/validation";
import {
  copyNoteContentToClipboard,
  type NoteCopyFormat,
} from "@/lib/clipboard/note-content";
import { useDocumentAutosave } from "@/lib/editor/use-document-autosave";
import { useZenMode } from "@/lib/editor/use-zen-mode";

import type { NoteEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";
import { notifySubjectDocumentsChanged } from "@/lib/trees/subject-documents-events";
import { cn } from "@/lib/utils";

interface NoteDetailProps {
  note: NoteEntity;
  subjectName: string;
}

function getEditValues(note: NoteEntity): EditNoteForm {
  return {
    id: note.id,
    title: note.title,
    content: note.content ?? "",
  };
}

function isSameNoteEdit(left: EditNoteForm, right: EditNoteForm) {
  return left.title === right.title && (left.content ?? "") === right.content;
}

export function NoteDetail({ note, subjectName }: Readonly<NoteDetailProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startNavTransition] = useTransition();
  const { isZenMode, toggleZenMode } = useZenMode();
  const assistantWorkspace = useAssistantWorkspace();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [assistantEditor, setAssistantEditor] = useState<Editor | null>(null);
  const lastSavedValuesRef = useRef(getEditValues(note));
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<EditNoteForm>({
    resolver: zodResolver(editNoteSchema),
    defaultValues: getEditValues(note),
  });
  const watchedTitle = form.watch("title");
  const watchedContent = form.watch("content") ?? "";
  const documentReview = useActiveNoteEditor({
    editor: assistantEditor,
    form,
    id: note.id,
    title: watchedTitle,
    subjectPath: subjectName,
    blocked: isImageUploading,
  });
  useStudyContext(
    buildDocumentContext(
      "note",
      watchedTitle,
      subjectName,
      watchedContent,
      note.id,
    ),
  );
  useEffect(() => {
    const nextValues = getEditValues(note);
    const currentValues = form.getValues();
    const previousSavedValues = lastSavedValuesRef.current;
    const isDifferentNote = currentValues.id !== note.id;
    const hasLocalEdits = !isSameNoteEdit(currentValues, previousSavedValues);

    lastSavedValuesRef.current = nextValues;

    if (
      isDifferentNote ||
      !hasLocalEdits ||
      isSameNoteEdit(currentValues, nextValues)
    ) {
      form.reset(nextValues);
    }
  }, [form, note]);

  const autosave = useDocumentAutosave({
    documentId: note.id,
    initialValue: getEditValues(note),
    value: { id: note.id, title: watchedTitle, content: watchedContent },
    blocked: isImageUploading,
    persist: async (values) => {
      if (!editNoteSchema.safeParse(values).success) {
        await form.trigger();
        return false;
      }
      const result = await editNote(values);
      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return false;
      }
      if (form.getValues("id") === values.id)
        lastSavedValuesRef.current = values;
      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      return true;
    },
    onError: () => toast.error("Couldn't save the note"),
  });

  async function copyNoteContent(format: NoteCopyFormat) {
    try {
      await copyNoteContentToClipboard(form.getValues("content") ?? "", format);
      toast.success("Note copied.");
    } catch {
      toast.error("Could not copy note.");
    }
  }

  return (
    <>
      {!isZenMode ? (
        <PageTopBar
          breadcrumb={{
            parent: { label: subjectName, icon: "book-open" },
            current: { label: watchedTitle || note.title || "Untitled" },
          }}
        />
      ) : null}
      <AppPageContainer
        maxWidth="7xl"
        className={cn(
          "lg:flex lg:flex-col lg:overflow-hidden",
          isZenMode && assistantWorkspace?.open && "lg:pr-96",
          isZenMode
            ? "fixed inset-0 z-immersive flex h-svh max-w-none flex-col overflow-hidden bg-background py-4"
            : "lg:h-[calc(100svh-3.5rem)] lg:pb-6",
        )}
      >
        {isZenMode ? <AssistantSurfaceHost /> : null}
        <div
          className={cn(
            "flex flex-col gap-6 lg:min-h-0 lg:flex-1",
            isZenMode ? "min-h-0 flex-1" : null,
          )}
        >
          <form
            className={cn(
              "min-w-0 space-y-4",
              isZenMode
                ? "flex min-h-0 flex-1 flex-col"
                : "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:space-y-4",
            )}
          >
            <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start">
                <Controller
                  name="title"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="min-w-0 flex-1">
                      <Input
                        {...field}
                        ref={(element) => {
                          field.ref(element);
                          titleInputRef.current = element;
                        }}
                        id="form-edit-note-title"
                        aria-label="Note title"
                        aria-invalid={fieldState.invalid}
                        className={cn(
                          "h-10 w-full min-w-0 rounded-md border-0 bg-transparent px-3 py-0 text-lg leading-10 font-semibold tracking-tight shadow-none hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-xl",
                          documentReview &&
                            documentReview.baseline.draft.title !==
                              documentReview.prepared.title &&
                            "hidden",
                        )}
                        placeholder="Untitled note"
                      />
                      {documentReview &&
                      documentReview.baseline.draft.title !==
                        documentReview.prepared.title ? (
                        <DocumentTitleReview
                          original={documentReview.baseline.draft.title}
                          replacement={documentReview.prepared.title}
                        />
                      ) : null}
                      {fieldState.invalid ? (
                        <FieldError
                          className="mt-2"
                          errors={[fieldState.error]}
                        />
                      ) : null}
                    </div>
                  )}
                />
              </div>

              <div className="flex shrink-0 gap-2">
                <DocumentAutosaveFeedback {...autosave} />
                <ZenModeToggle
                  isZenMode={isZenMode}
                  onToggle={toggleZenMode}
                  className="size-10"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      className="size-10 shrink-0"
                      aria-label="Open note actions"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => titleInputRef.current?.focus()}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => void copyNoteContent("rich")}
                    >
                      <Clipboard className="size-4" />
                      Copy as rich text
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => void copyNoteContent("plain")}
                    >
                      <Clipboard className="size-4" />
                      Copy as plain text
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Controller
              name="content"
              control={form.control}
              render={({ field, fieldState }) => (
                <div
                  className={cn(
                    "min-h-0 w-full min-w-0 overflow-hidden",
                    isZenMode ? "flex flex-1" : "lg:flex lg:flex-1",
                  )}
                >
                  <TiptapEditor
                    onEditorReady={setAssistantEditor}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Write your notes here..."
                    id="form-edit-note-content"
                    aria-invalid={fieldState.invalid}
                    imageUploadContext="notes"
                    className={cn(
                      "w-full min-w-0 overflow-hidden",
                      isZenMode
                        ? "flex min-h-0 flex-1 flex-col"
                        : "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col",
                      documentReview && "hidden lg:hidden",
                    )}
                    contentClassName={cn(
                      "w-full min-w-0 overflow-x-hidden",
                      isZenMode
                        ? "min-h-0 max-h-none flex-1 overflow-y-auto"
                        : "min-h-[60svh] lg:min-h-0 lg:max-h-none lg:flex-1 lg:overflow-y-auto",
                    )}
                    onImageUploadPendingChange={setIsImageUploading}
                  />
                  {documentReview ? (
                    <NoteDocumentReview
                      proposal={documentReview}
                      disabled={isImageUploading}
                    />
                  ) : null}
                  {fieldState.invalid ? (
                    <FieldError className="mt-2" errors={[fieldState.error]} />
                  ) : null}
                </div>
              )}
            />
          </form>
        </div>

        <DeleteNoteDialog
          noteId={note.id}
          noteTitle={watchedTitle || note.title}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onSuccess={() => {
            setDeleteOpen(false);
            notifySubjectDocumentsChanged(note.subjectId);
            startNavTransition(() => router.push("/"));
          }}
        />
      </AppPageContainer>
    </>
  );
}
