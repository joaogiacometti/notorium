"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editDeck } from "@/app/actions/decks";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type EditDeckForm, editDeckSchema } from "@/features/decks/validation";
import { LIMITS } from "@/lib/config/limits";
import { t } from "@/lib/server/server-action-errors";

interface EditDeckDialogProps {
  deck: {
    id: string;
    name: string;
    description: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getEditDeckFormValues(
  deck: EditDeckDialogProps["deck"],
): EditDeckForm {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description ?? "",
  };
}

export function EditDeckDialog({
  deck,
  open,
  onOpenChange,
}: Readonly<EditDeckDialogProps>) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<EditDeckForm>({
    resolver: zodResolver(editDeckSchema),
    defaultValues: getEditDeckFormValues(deck),
  });

  useEffect(() => {
    form.reset(getEditDeckFormValues(deck));
  }, [form, deck]);

  async function onSubmit(data: EditDeckForm) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await editDeck(data);
      if (result.success) {
        form.reset(getEditDeckFormValues(deck));
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    } finally {
      setIsSubmitting(false);
    }
  }

  const formId = "form-edit-deck";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Deck</DialogTitle>
        </DialogHeader>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={`${formId}-name`}
                    placeholder="e.g., Chapter 1 Vocabulary"
                    maxLength={LIMITS.deckNameMax}
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-description`}>
                    Description (optional)
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={`${formId}-description`}
                    placeholder="Brief description of this deck"
                    maxLength={LIMITS.deckDescriptionMax}
                    rows={3}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Button
              type="submit"
              form={formId}
              disabled={isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={isSubmitting}
                idleLabel="Save"
                pendingLabel="Saving..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
