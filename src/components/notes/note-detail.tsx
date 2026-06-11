"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clipboard,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editNote } from "@/app/actions/notes";
import { DocumentsNav } from "@/components/documents/documents-nav";
import { ZenModeToggle } from "@/components/documents/zen-mode-toggle";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { GenerateNoteFlashcardsDialog } from "@/components/notes/generate-note-flashcards-dialog";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
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
import type { DocumentListItem } from "@/features/documents/types";
import { type EditNoteForm, editNoteSchema } from "@/features/notes/validation";
import {
  copyNoteContentToClipboard,
  type NoteCopyFormat,
} from "@/lib/clipboard/note-content";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
import { useZenMode } from "@/lib/editor/use-zen-mode";
import { getSubjectDocumentsHref } from "@/lib/navigation/detail-page-back-link";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";
import type { DeckOption, NoteEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";
import { cn } from "@/lib/utils";

interface NoteDetailProps {
  aiEnabled: boolean;
  backHref: string;
  backLabel: string;
  decks: DeckOption[];
  note: NoteEntity;
  documents: DocumentListItem[];
}

const AUTOSAVE_DELAY_MS = 800;

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

export function NoteDetail({
  aiEnabled,
  backHref,
  backLabel,
  decks,
  note,
  documents,
}: Readonly<NoteDetailProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startNavTransition] = useTransition();
  const { isZenMode, toggleZenMode } = useZenMode();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const lastSavedValuesRef = useRef(getEditValues(note));
  const saveSequenceRef = useRef(0);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const hasDecks = decks.length > 0;
  const form = useForm<EditNoteForm>({
    resolver: zodResolver(editNoteSchema),
    defaultValues: getEditValues(note),
  });
  const watchedTitle = form.watch("title");
  const watchedContent = form.watch("content") ?? "";
  const debouncedTitle = useDebouncedValue(watchedTitle, AUTOSAVE_DELAY_MS);
  const debouncedContent = useDebouncedValue(watchedContent, AUTOSAVE_DELAY_MS);

  const hasDirtyValues = !isSameNoteEdit(form.getValues(), {
    ...lastSavedValuesRef.current,
    id: note.id,
  });

  useBeforeUnload(hasDirtyValues || isSaving || isImageUploading);

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

    setIsSaving(false);
  }, [form, note]);

  const saveNoteValues = useCallback(
    async (values: EditNoteForm) => {
      const isValid = await form.trigger();
      if (!isValid) {
        return false;
      }

      const saveSequence = saveSequenceRef.current + 1;
      saveSequenceRef.current = saveSequence;
      setIsSaving(true);

      const result = await editNote(values);

      if (saveSequence !== saveSequenceRef.current) {
        return result.success;
      }

      setIsSaving(false);

      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return false;
      }

      lastSavedValuesRef.current = values;
      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      if (isSameNoteEdit(form.getValues(), values)) {
        form.reset(values);
      }

      return true;
    },
    [form, queryClient],
  );

  useEffect(() => {
    const nextValues = {
      id: note.id,
      title: debouncedTitle,
      content: debouncedContent,
    };

    if (isSameNoteEdit(nextValues, lastSavedValuesRef.current)) {
      return;
    }

    if (isImageUploading) {
      return;
    }

    void saveNoteValues(nextValues);
  }, [
    debouncedContent,
    debouncedTitle,
    isImageUploading,
    note.id,
    saveNoteValues,
  ]);

  async function saveBeforeNavigation(href: string) {
    if (isImageUploading) {
      toast.error("Wait for image upload to finish before leaving this note.");
      return;
    }

    const values = form.getValues();
    if (!isSameNoteEdit(values, lastSavedValuesRef.current)) {
      const saved = await saveNoteValues(values);
      if (!saved) {
        return;
      }
    }

    startNavTransition(() => router.push(href));
  }

  async function copyNoteContent(format: NoteCopyFormat) {
    try {
      await copyNoteContentToClipboard(form.getValues("content") ?? "", format);
      toast.success("Note copied.");
    } catch {
      toast.error("Could not copy note.");
    }
  }

  const sidebarDocuments = documents.map((item) =>
    item.kind === "note" && item.id === note.id
      ? { ...item, title: watchedTitle || item.title }
      : item,
  );

  return (
    <AppPageContainer
      maxWidth="7xl"
      className={cn(
        "lg:flex lg:flex-col lg:overflow-hidden",
        isZenMode
          ? "fixed inset-0 z-50 flex h-svh max-w-none flex-col overflow-hidden bg-background py-4"
          : "lg:h-[calc(100svh-4rem)] lg:pb-6",
      )}
    >
      {!isZenMode ? (
        <div className="mb-4 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href={backHref}>
              <ArrowLeft className="size-4" />
              {backLabel}
            </Link>
          </Button>
        </div>
      ) : null}
      <div
        className={cn(
          "grid gap-6 lg:min-h-0 lg:flex-1",
          isZenMode ? "min-h-0 flex-1" : "lg:grid-cols-[14rem_minmax(0,1fr)]",
        )}
      >
        {!isZenMode ? (
          <DocumentsNav
            subjectId={note.subjectId}
            documents={sidebarDocuments}
            activeId={note.id}
            activeKind="note"
            aiEnabled={aiEnabled}
            decks={decks}
            onNavigate={(href, event) => {
              event.preventDefault();
              void saveBeforeNavigation(href);
            }}
            onEditActive={() => titleInputRef.current?.focus()}
            onDeleteActive={() => setDeleteOpen(true)}
            onCopyActive={(format) => void copyNoteContent(format)}
            onGenerateActive={() => setGenerateOpen(true)}
          />
        ) : null}

        <form
          className={cn(
            "min-w-0 space-y-4",
            isZenMode
              ? "flex min-h-0 flex-1 flex-col"
              : "lg:flex lg:min-h-0 lg:flex-col lg:space-y-4",
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
                      className="h-10 w-full min-w-0 rounded-md border-0 bg-transparent px-3 py-0 text-lg leading-10 font-semibold tracking-tight shadow-none hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-xl"
                      placeholder="Untitled note"
                    />
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
                  {aiEnabled ? (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setGenerateOpen(true)}
                      disabled={!hasDecks}
                      title={
                        hasDecks
                          ? undefined
                          : "Create a deck before generating flashcards."
                      }
                    >
                      <Sparkles className="size-4" />
                      Generate flashcards
                    </DropdownMenuItem>
                  ) : null}
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
                  )}
                  contentClassName={cn(
                    "w-full min-w-0 overflow-x-hidden",
                    isZenMode
                      ? "min-h-0 max-h-none flex-1 overflow-y-auto"
                      : "min-h-[60svh] lg:min-h-0 lg:max-h-none lg:flex-1 lg:overflow-y-auto",
                  )}
                  onImageUploadPendingChange={setIsImageUploading}
                />
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
          startNavTransition(() =>
            router.push(getSubjectDocumentsHref(note.subjectId)),
          );
        }}
      />
      {aiEnabled ? (
        <GenerateNoteFlashcardsDialog
          decks={decks}
          noteId={note.id}
          open={generateOpen}
          onOpenChange={setGenerateOpen}
        />
      ) : null}
    </AppPageContainer>
  );
}
