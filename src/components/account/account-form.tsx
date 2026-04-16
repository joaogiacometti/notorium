"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateAccount } from "@/app/actions/account";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import { NotificationPreferencesCard } from "@/components/account/notification-preferences-card";
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
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface AccountFormProps {
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  emailEnabled: boolean;
  initialNotificationsEnabled: boolean;
  initialNotificationDaysBefore: number;
}

export function AccountForm({
  name,
  email,
  createdAt,
  updatedAt,
  emailEnabled,
  initialNotificationsEnabled,
  initialNotificationDaysBefore,
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
      <section id="account" className="scroll-mt-24">
        <Card className="gap-4 py-5">
          <CardHeader className="pb-0">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <User className="size-4" />
              </div>
              <div className="space-y-1">
                <CardTitle>Account</CardTitle>
                <CardDescription>
                  Update your profile information.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <form id="form-account" onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup className="gap-3">
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

                <div className="grid gap-1 rounded-lg border bg-muted/20 px-3 py-2.5 text-sm sm:grid-cols-2 sm:gap-3">
                  <p className="sm:text-left">
                    <span className="text-muted-foreground">Joined:</span>{" "}
                    {createdAtLabel}
                  </p>
                  <p className="sm:text-right">
                    <span className="text-muted-foreground">Updated:</span>{" "}
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
      </section>

      {emailEnabled && (
        <section id="notifications" className="scroll-mt-24">
          <NotificationPreferencesCard
            initialEnabled={initialNotificationsEnabled}
            initialDaysBefore={initialNotificationDaysBefore}
          />
        </section>
      )}

      <section id="danger-zone" className="scroll-mt-24">
        <Card className="gap-4 border-(--intent-danger-border) py-5">
          <CardHeader className="pb-0">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-(--intent-danger-bg) p-2 text-(--intent-danger-text)">
                <AlertTriangle className="size-4" />
              </div>
              <div className="space-y-1">
                <CardTitle>Danger Zone</CardTitle>
                <CardDescription>
                  Delete your account and all associated data permanently.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="mb-3 text-sm text-muted-foreground">
              This action permanently removes your subjects, notes, assessments,
              and attendance records.
            </p>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="w-full sm:w-fit"
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </section>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
