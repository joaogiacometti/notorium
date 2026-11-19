"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateAccount } from "@/app/actions/account";
import { AccountAvatar } from "@/components/account/account-avatar";
import { SettingsCard } from "@/components/account/settings-section";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  type UpdateAccountForm,
  updateAccountSchema,
} from "@/features/account/validation";
import { invalidateAccountSettings } from "@/lib/client-cache/invalidation";
import type { AccountSettings } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

type AccountProfileCardProps = Pick<
  AccountSettings,
  "name" | "email" | "memberSince"
>;

export function AccountProfileCard({
  name,
  email,
  memberSince,
}: Readonly<AccountProfileCardProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(updateAccountSchema),
    defaultValues: { name },
  });
  const { isDirty, isSubmitting } = form.formState;

  async function onSubmit(data: UpdateAccountForm) {
    const result = await updateAccount(data);
    if (result.success) {
      form.reset({ name: data.name });
      toast.success("Display name saved.");
      router.refresh();
      await invalidateAccountSettings(queryClient);
      return;
    }
    toast.error(resolveActionErrorMessage(result));
  }

  return (
    <SettingsCard
      title={name}
      description={
        <span className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs">
          <span className="flex min-w-0 items-center gap-1">
            <Mail aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{email}</span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar aria-hidden className="size-3.5 shrink-0" />
            Member since {memberSince}
          </span>
        </span>
      }
      media={<AccountAvatar name={name} className="size-12 text-base" />}
      keywords="profile display name username email address member since joined"
    >
      <form id="form-account" onSubmit={form.handleSubmit(onSubmit)}>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="form-account-name">Display name</FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  {...field}
                  id="form-account-name"
                  type="text"
                  placeholder="John Doe"
                  aria-invalid={fieldState.invalid}
                  autoComplete="name"
                  className="sm:max-w-sm"
                />
                {isDirty ? (
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      <AsyncButtonContent
                        pending={isSubmitting}
                        idleLabel="Save"
                        pendingLabel="Saving…"
                      />
                    </Button>
                    {isSubmitting ? null : (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => form.reset()}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </form>
    </SettingsCard>
  );
}
