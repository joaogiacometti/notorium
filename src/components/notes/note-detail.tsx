"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clipboard,
  FileText,
  MoreVertical,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editNote } from "@/app/actions/notes";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { GenerateNoteFlashcardsDialog } from "@/components/notes/generate-note-flashcards-dialog";
import { NoteSidebar } from "@/components/notes/note-sidebar";
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
import { type EditNoteForm, editNoteSchema } from "@/features/notes/validation";
import {
  copyNoteContentToClipboard,
  type NoteCopyFormat,
} from "@/lib/clipboard/note-content";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";
import type { DeckOption, NoteEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface NoteDetailProps {
  aiEnabled: boolean;
  backHref: string;
  backLabel: string;
  decks: DeckOption[];
  note: NoteEntity;
  subjectNotes: NoteEntity[];
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
  subjectNotes,
}: Readonly<NoteDetailProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startNavTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const lastSavedValuesRef = useRef(getEditValues(note));
  const saveSequenceRef = useRef(0);
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

  return (
    <AppPageContainer
      maxWidth="5xl"
      className="lg:flex lg:h-[calc(100svh-4rem)] lg:flex-col lg:overflow-hidden lg:pb-6"
    >
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
      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <NoteSidebar
          activeNoteId={note.id}
          notes={subjectNotes.map((subjectNote) =>
            subjectNote.id === note.id
              ? { ...subjectNote, title: watchedTitle || subjectNote.title }
              : subjectNote,
          )}
          subjectId={note.subjectId}
          onNoteNavigate={(href, event) => {
            event.preventDefault();
            void saveBeforeNavigation(href);
          }}
        />

        <form className="min-w-0 space-y-4 overflow-hidden lg:flex lg:min-h-0 lg:flex-col lg:space-y-4">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground">
                <FileText className="size-5" />
              </div>
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div className="min-w-0 flex-1">
                    <Input
                      {...field}
                      id="form-edit-note-title"
                      aria-label="Note title"
                      aria-invalid={fieldState.invalid}
                      className="-mx-2 h-10 w-full min-w-0 rounded-md border-0 bg-transparent px-2 py-0 text-lg leading-10 font-semibold tracking-tight shadow-none hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-xl"
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
                  {aiEnabled ? (
                    <>
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
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
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
              <div className="min-h-0 w-full min-w-0 overflow-hidden lg:flex lg:flex-1">
                <TiptapEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Write your notes here..."
                  id="form-edit-note-content"
                  aria-invalid={fieldState.invalid}
                  imageUploadContext="notes"
                  className="w-full min-w-0 overflow-hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
                  contentClassName="min-h-[60svh] w-full min-w-0 overflow-x-hidden lg:min-h-0 lg:max-h-none lg:flex-1 lg:overflow-y-auto"
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
          startNavTransition(() => router.push(backHref));
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
