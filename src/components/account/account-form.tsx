"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateAccount } from "@/app/actions/account";
import { AiSettingsCard } from "@/components/account/ai-settings-card";
import { DataTransferActions } from "@/components/account/data-transfer-actions";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  type UpdateAccountForm,
  updateAccountSchema,
} from "@/features/account/validation";
import { formatDateLong, formatDateShort } from "@/lib/dates/format";
import type { UserAiSettingsSummary } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface AccountFormProps {
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  initialAiSettings: UserAiSettingsSummary | null;
}

export function AccountForm({
  name,
  email,
  createdAt,
  updatedAt,
  initialAiSettings,
}: Readonly<AccountFormProps>) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(updateAccountSchema),
    defaultValues: {
      name,
    },
  });

  const createdAtLabel = formatDateLong(createdAt);
  const updatedAtLabel = formatDateShort(updatedAt);

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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Inspect and update your account details and settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="form-account" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-account-name">
                      Full Name
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-account-name"
                      type="text"
                      placeholder="John Doe"
                      aria-invalid={fieldState.invalid}
                      autoComplete="name"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Field>
                <FieldLabel htmlFor="form-account-email">Email</FieldLabel>
                <Input
                  id="form-account-email"
                  value={email}
                  type="email"
                  disabled
                  readOnly
                />
              </Field>

              <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                <p className="mt-1">
                  <span className="text-muted-foreground">Joined:</span>{" "}
                  {createdAtLabel}
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Last updated:</span>{" "}
                  {updatedAtLabel}
                </p>
              </div>

              <Button
                type="submit"
                form="form-account"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-fit"
              >
                <AsyncButtonContent
                  pending={form.formState.isSubmitting}
                  idleLabel="Save Changes"
                  pendingLabel="Saving..."
                />
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <AiSettingsCard initialAiSettings={initialAiSettings} />

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Data Transfer</CardTitle>
          <CardDescription>
            Export your study data as a JSON file, or import data from a
            previous Notorium export. API keys, account details, sessions, and
            other sensitive information are never included.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTransferActions />
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Once you delete your account, all of your subjects, notes,
            assessments, and attendance records will be permanently removed.
            This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
