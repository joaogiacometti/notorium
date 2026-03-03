"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { signUpAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import { cn } from "@/lib/utils";
import {
  type SignupForm as SignupFormValues,
  signupSchema,
} from "@/lib/validations/auth";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const t = useTranslations("SignupForm");
  const tErrors = useTranslations("ServerActions");
  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: SignupFormValues) {
    const result = await signUpAction(data);
    if (result && !result.success) {
      toast.error(resolveActionErrorMessage(result, tErrors));
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            id="form-signup"
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-4 sm:p-6 md:p-8"
          >
            <FieldGroup className="gap-4 md:gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">{t("title")}</h1>
              </div>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-signup-name">
                      {t("name_label")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-signup-name"
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
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-signup-email">
                      {t("email_label")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-signup-email"
                      type="email"
                      placeholder={t("email_placeholder")}
                      aria-invalid={fieldState.invalid}
                      autoComplete="email"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Field className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="form-signup-password">
                        {t("password_label")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="form-signup-password"
                        type="password"
                        aria-invalid={fieldState.invalid}
                        autoComplete="new-password"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="confirmPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="form-signup-confirm-password">
                        {t("confirm_password_label")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="form-signup-confirm-password"
                        type="password"
                        aria-invalid={fieldState.invalid}
                        autoComplete="new-password"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </Field>
              <Field>
                <Button
                  type="submit"
                  form="form-signup"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? t("submitting") : t("submit")}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                {t("has_account")} <Link href="/login">{t("sign_in")}</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-muted/40 to-background" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full border border-primary/20 bg-primary/10 p-5">
                <BookOpen className="size-10 text-primary" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
