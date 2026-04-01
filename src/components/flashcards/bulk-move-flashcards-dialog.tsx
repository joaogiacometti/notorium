"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { bulkMoveFlashcards } from "@/app/actions/flashcards";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { SubjectText } from "@/components/shared/subject-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type BulkMoveFlashcardsForm,
  bulkMoveFlashcardsSchema,
} from "@/features/flashcards/validation";
import type { SubjectEntity } from "@/lib/server/api-contracts";
import { tErrors } from "@/lib/server/error-messages";

interface BulkMoveFlashcardsDialogProps {
  ids: string[];
  open: boolean;
  onMoved: (ids: string[], subjectId: string) => void;
  onOpenChange: (open: boolean) => void;
  subjects: SubjectEntity[];
}

export function BulkMoveFlashcardsDialog({
  ids,
  open,
  onMoved,
  onOpenChange,
  subjects,
}: Readonly<BulkMoveFlashcardsDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<BulkMoveFlashcardsForm>({
    resolver: zodResolver(bulkMoveFlashcardsSchema),
    defaultValues: {
      ids,
      subjectId: "",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      ids,
      subjectId: "",
    });
  }, [form, ids, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({
        ids,
        subjectId: "",
      });
    }

    onOpenChange(nextOpen);
  }

  function onSubmit(values: BulkMoveFlashcardsForm) {
    startTransition(async () => {
      const result = await bulkMoveFlashcards(values);

      if (result.success) {
        onMoved(result.ids, result.subjectId);
        onOpenChange(false);
        form.reset({
          ids: [],
          subjectId: "",
        });
        return;
      }

      toast.error(tErrors(result.errorCode, result.errorParams));
    });
  }

  const count = ids.length;
  const descriptionText =
    count === 1
      ? "Move 1 selected flashcard to another subject."
      : `Move ${count} selected flashcards to another subject.`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Flashcards</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-3">
            <Controller
              name="subjectId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bulk-move-flashcards-subject">
                    Subject
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="bulk-move-flashcards-subject"
                      aria-invalid={fieldState.invalid}
                      className="h-10 rounded-lg"
                    >
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            <SubjectText
                              value={subject.name}
                              mode="truncate"
                              className="block max-w-full"
                            />
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                <AsyncButtonContent
                  pending={isPending}
                  idleLabel="Move"
                  pendingLabel="Moving..."
                />
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
