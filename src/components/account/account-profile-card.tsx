"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateAccount } from "@/app/actions/account";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/account/settings-section";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  type UpdateAccountForm,
  updateAccountSchema,
} from "@/features/account/validation";
import { formatDateLong } from "@/lib/dates/format";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface AccountProfileCardProps {
  name: string;
  email: string;
  createdAt: string;
}

/**
 * Account section of the settings dialog: editable display name plus read-only
 * email and join date, laid out as flat rows.
 *
 * @example
 * <AccountProfileCard name="Ada" email="ada@x.io" createdAt={iso} />
 */
export function AccountProfileCard({
  name,
  email,
  createdAt,
}: Readonly<AccountProfileCardProps>) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(updateAccountSchema),
    defaultValues: { name },
  });

  async function onSubmit(data: UpdateAccountForm) {
    const result = await updateAccount(data);
    if (result.success) {
      form.reset({ name: data.name });
      toast.success("Account updated.");
      router.refresh();
      return;
    }
    toast.error(resolveActionErrorMessage(result));
  }

  return (
    <SettingsSection title="Account">
      <SettingsRow
        label="Display name"
        description="The name shown across the app."
        keywords="username profile"
      >
        <form
          id="form-account"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-2 sm:flex-row sm:items-start"
        >
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="sm:max-w-xs">
                <Input
                  {...field}
                  id="form-account-name"
                  type="text"
                  placeholder="John Doe"
                  aria-label="Display name"
                  aria-invalid={fieldState.invalid}
                  autoComplete="name"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Button
            type="submit"
            form="form-account"
            disabled={form.formState.isSubmitting}
            className="sm:w-fit"
          >
            <AsyncButtonContent
              pending={form.formState.isSubmitting}
              idleLabel="Save"
              pendingLabel="Saving..."
            />
          </Button>
        </form>
      </SettingsRow>

      <SettingsRow label="Email" description={email} keywords="address" />
      <SettingsRow
        label="Member since"
        description={formatDateLong(createdAt)}
        keywords="joined date created"
      />
    </SettingsSection>
  );
}
