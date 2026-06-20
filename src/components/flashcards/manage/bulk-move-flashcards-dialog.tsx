"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { bulkMoveFlashcards } from "@/app/actions/flashcards";
import { getSubjectOptions } from "@/app/actions/subjects";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { SubjectSelect } from "@/components/shared/subject-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import {
  type BulkMoveFlashcardsForm,
  bulkMoveFlashcardsSchema,
} from "@/features/flashcards/validation";
import type { SubjectOption } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface BulkMoveFlashcardsDialogProps {
  ids: string[];
  open: boolean;
  onMoved: (ids: string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function BulkMoveFlashcardsDialog({
  ids,
  open,
  onMoved,
  onOpenChange,
}: Readonly<BulkMoveFlashcardsDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
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

    form.reset({ ids, subjectId: "" });
    void getSubjectOptions().then((fetchedSubjects) =>
      setSubjects(fetchedSubjects),
    );
  }, [form, open, ids]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({ ids, subjectId: "" });
    }
    onOpenChange(nextOpen);
  }

  function onSubmit(values: BulkMoveFlashcardsForm) {
    startTransition(async () => {
      const result = await bulkMoveFlashcards(values);

      if (result.success) {
        onMoved(result.ids);
        onOpenChange(false);
        form.reset({ ids: [], subjectId: "" });
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
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
          <FieldGroup className="gap-5">
            <Controller
              name="subjectId"
              control={form.control}
              render={({ field, fieldState }) => (
                <SubjectSelect
                  value={field.value ?? null}
                  onChange={field.onChange}
                  subjects={subjects}
                  id="bulk-move-flashcards-subject"
                  error={fieldState.error?.message as string}
                  ariaInvalid={fieldState.invalid}
                />
              )}
            />
            <DialogFooter className="gap-3 sm:gap-3">
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
