"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateProfile } from "@/app/actions/profile";
import { DataTransferActions } from "@/components/data-transfer-actions";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
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
import { useRouter } from "@/i18n/routing";
import { getIntlLocale } from "@/lib/date-locale";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import {
  type UpdateProfileForm,
  updateProfileSchema,
} from "@/lib/validations/profile";

interface ProfileFormProps {
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export function ProfileForm({
  name,
  email,
  createdAt,
  updatedAt,
}: Readonly<ProfileFormProps>) {
  const locale = useLocale();
  const intlLocale = getIntlLocale(locale);
  const t = useTranslations("ProfileForm");
  const tErrors = useTranslations("ServerActions");
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name,
    },
  });

  const createdAtLabel = new Date(createdAt).toLocaleDateString(intlLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const updatedAtLabel = new Date(updatedAt).toLocaleString(intlLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function onSubmit(data: UpdateProfileForm) {
    const result = await updateProfile(data);
    if (result.success) {
      form.reset({ name: data.name });
      toast.success(t("toast_success"));
      router.refresh();
      return;
    }
    toast.error(resolveActionErrorMessage(result, tErrors));
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("profile_title")}</CardTitle>
          <CardDescription>{t("profile_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="form-profile" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-profile-name">
                      {t("name_label")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-profile-name"
                      type="text"
                      placeholder={t("name_placeholder")}
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
                <FieldLabel htmlFor="form-profile-email">
                  {t("email_label")}
                </FieldLabel>
                <Input
                  id="form-profile-email"
                  value={email}
                  type="email"
                  disabled
                  readOnly
                />
              </Field>

              <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                <p className="mt-1">
                  <span className="text-muted-foreground">{t("joined")}:</span>{" "}
                  {createdAtLabel}
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">
                    {t("last_updated")}:
                  </span>{" "}
                  {updatedAtLabel}
                </p>
              </div>

              <Button
                type="submit"
                form="form-profile"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-fit"
              >
                {form.formState.isSubmitting ? t("saving") : t("save_changes")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>{t("data_transfer_title")}</CardTitle>
          <CardDescription>{t("data_transfer_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTransferActions />
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>{t("danger_title")}</CardTitle>
          <CardDescription>{t("danger_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("danger_body")}
          </p>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            {t("delete_account")}
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
