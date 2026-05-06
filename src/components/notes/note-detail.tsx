"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clipboard,
  FileText,
  MoreVertical,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editNote } from "@/app/actions/notes";
import { CreateNoteTitleDialog } from "@/components/notes/create-note-title-dialog";
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
import { type EditNoteForm, editNoteSchema } from "@/features/notes/validation";
import {
  copyNoteContentToClipboard,
  type NoteCopyFormat,
} from "@/lib/clipboard/note-content";
import { LIMITS } from "@/lib/config/limits";
import { formatRelativeTime } from "@/lib/dates/format";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const lastSavedValuesRef = useRef(getEditValues(note));
  const saveSequenceRef = useRef(0);
  const hasDecks = decks.length > 0;
  const isAtNoteLimit = subjectNotes.length >= LIMITS.maxNotesPerSubject;
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
    lastSavedValuesRef.current = nextValues;
    form.reset(nextValues);
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
        <aside className="min-w-0 border-border bg-transparent lg:flex lg:min-h-0 lg:flex-col lg:border-r">
          <div className="border-b border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Notes
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subjectNotes.length} notes in subject
                </p>
              </div>
              <CreateNoteTitleDialog
                subjectId={note.subjectId}
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSuccess={(noteId) => {
                  startNavTransition(() => {
                    router.push(`/subjects/${note.subjectId}/notes/${noteId}`);
                  });
                }}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Create note"
                    disabled={isAtNoteLimit}
                    title={
                      isAtNoteLimit
                        ? "Delete an existing note to create a new one."
                        : undefined
                    }
                  >
                    <Plus className="size-4" />
                  </Button>
                }
              />
            </div>
          </div>
          <nav
            aria-label="Subject notes"
            className="flex gap-2 overflow-x-auto !bg-transparent p-3 !shadow-none lg:block lg:min-h-0 lg:flex-1 lg:space-y-1 lg:overflow-y-auto"
          >
            {subjectNotes.map((subjectNote) => {
              const href = `/subjects/${subjectNote.subjectId}/notes/${subjectNote.id}`;
              const isActive = subjectNote.id === note.id;

              return (
                <Link
                  key={subjectNote.id}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(event) => {
                    if (isActive) {
                      return;
                    }
                    event.preventDefault();
                    void saveBeforeNavigation(href);
                  }}
                  className={cn(
                    "block min-w-48 rounded-md px-3 py-2.5 text-left transition-colors lg:min-w-0",
                    "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                    isActive
                      ? "bg-muted/45 text-foreground"
                      : "text-muted-foreground hover:bg-muted/35 hover:text-foreground",
                  )}
                >
                  <span className="block truncate text-sm font-medium">
                    {isActive
                      ? watchedTitle || subjectNote.title
                      : subjectNote.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground/70">
                    Updated {formatRelativeTime(subjectNote.updatedAt)}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <form className="min-w-0 space-y-4 lg:flex lg:min-h-0 lg:flex-col lg:space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
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
                      className="-mx-2 h-auto rounded-md border-0 bg-transparent px-2 py-2 text-2xl leading-tight font-semibold tracking-tight shadow-none hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-3xl"
                      placeholder="Untitled note"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Created {formatRelativeTime(note.createdAt)}
                    </p>
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

            <div className="flex w-full shrink-0 gap-2 sm:w-auto">
              {aiEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 sm:flex-none"
                  onClick={() => setGenerateOpen(true)}
                  disabled={!hasDecks}
                  title={
                    hasDecks
                      ? undefined
                      : "Create a deck before generating flashcards."
                  }
                >
                  <Sparkles className="size-3.5" />
                  Generate flashcards
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label="Open note actions"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
              <div className="min-h-0 lg:flex lg:flex-1">
                <TiptapEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Write your notes here..."
                  id="form-edit-note-content"
                  aria-invalid={fieldState.invalid}
                  imageUploadContext="notes"
                  className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
                  contentClassName="min-h-[60svh] lg:min-h-0 lg:max-h-none lg:flex-1 lg:overflow-y-auto"
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
