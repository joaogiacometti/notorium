"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  type LoginForm as LoginFormValues,
  loginSchema,
} from "@/lib/validations/auth";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const t = useTranslations("LoginForm");
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: LoginFormValues) {
    const result = await loginAction(data);
    if (result && !result.success) {
      toast.error(result.error);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="form-login" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-login-email">
                      {t("email_label")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-login-email"
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
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="form-login-password">
                        {t("password_label")}
                      </FieldLabel>
                      <Link
                        href="#"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                      >
                        {t("forgot_password")}
                      </Link>
                    </div>
                    <Input
                      {...field}
                      id="form-login-password"
                      type="password"
                      aria-invalid={fieldState.invalid}
                      autoComplete="current-password"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Field>
                <Button type="submit" form="form-login" disabled={isSubmitting}>
                  {isSubmitting ? t("submitting") : t("submit")}
                </Button>
                <FieldDescription className="text-center">
                  {t("no_account")} <Link href="/signup">{t("sign_up")}</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
