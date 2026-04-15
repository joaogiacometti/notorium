"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createDeck } from "@/app/actions/decks";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  type CreateDeckForm,
  createDeckSchema,
} from "@/features/decks/validation";
import { LIMITS } from "@/lib/config/limits";
import type { DeckEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface CreateDeckDialogProps {
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentDeckId?: string;
  onCreated?: (deck: DeckEntity) => void;
}

function getCreateDeckFormValues(parentDeckId?: string): CreateDeckForm {
  return {
    parentDeckId,
    name: "",
  };
}

export function CreateDeckDialog({
  trigger,
  open,
  onOpenChange,
  parentDeckId,
  onCreated,
}: Readonly<CreateDeckDialogProps>) {
  const [_isPending, _startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CreateDeckForm>({
    resolver: zodResolver(createDeckSchema),
    defaultValues: getCreateDeckFormValues(parentDeckId),
  });

  useEffect(() => {
    form.reset(getCreateDeckFormValues(parentDeckId));
  }, [form, parentDeckId]);

  async function onSubmit(data: CreateDeckForm) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createDeck(data);
      if (result.success) {
        form.reset(getCreateDeckFormValues(parentDeckId));
        onCreated?.(result.deck);
        onOpenChange(false);
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    } finally {
      setIsSubmitting(false);
    }
  }

  const formId = "form-create-deck";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {parentDeckId ? "Create Sub-deck" : "Create Deck"}
          </DialogTitle>
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
            <Button
              type="submit"
              form={formId}
              disabled={isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={isSubmitting}
                idleLabel="Create"
                pendingLabel="Creating..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
