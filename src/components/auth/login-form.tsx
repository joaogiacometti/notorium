"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Clock3 } from "lucide-react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { loginAction } from "@/app/actions/auth";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { handleAuthRedirect } from "@/components/auth/handle-auth-redirect";
import { PasswordField } from "@/components/auth/password-field";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import { cn } from "@/lib/utils";
import {
  type LoginForm as LoginFormValues,
  loginSchema,
} from "@/lib/validations/auth";

export function LoginForm({
  showPendingApprovalNotice = false,
  showForgotPasswordLink = false,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  showPendingApprovalNotice?: boolean;
  showForgotPasswordLink?: boolean;
}) {
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
      toast.error(resolveActionErrorMessage(result));
      return;
    }

    if (!result?.success) {
      return;
    }

    handleAuthRedirect(result);
  }

  return (
    <AuthFormShell
      heading="Sign in to Notorium"
      subheading="Pick up where your study plan left off."
      footer={
        <>
          Need an account? <Link href="/signup">Create one</Link>
        </>
      }
      className={cn(className)}
      {...props}
    >
      <form id="form-login" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4 md:gap-6">
          {showPendingApprovalNotice ? (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--intent-info-border)] bg-[var(--intent-info-bg)] px-4 py-3 text-sm">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-[var(--intent-info-fill)]" />
              <div className="space-y-1">
                <p className="font-medium text-[var(--intent-info-text)]">
                  Account created successfully.
                </p>
                <p className="text-[var(--intent-info-text)]/90">
                  Your access now waits for administrator approval.
                </p>
              </div>
            </div>
          ) : null}
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="form-login-email">Email</FieldLabel>
                <Input
                  {...field}
                  id="form-login-email"
                  type="email"
                  placeholder="name@school.edu"
                  aria-invalid={fieldState.invalid}
                  autoComplete="email"
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <PasswordField
                id="form-login-password"
                label="Password"
                value={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
                autoComplete="current-password"
                invalid={fieldState.invalid}
                error={fieldState.error}
                trailingSlot={
                  showForgotPasswordLink ? (
                    <Link
                      href="/forgot-password"
                      className="rounded-sm text-sm text-foreground/90 underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Forgot password?
                    </Link>
                  ) : undefined
                }
              />
            )}
          />
          <Field>
            <Button
              type="submit"
              form="form-login"
              disabled={isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={isSubmitting}
                idleLabel="Sign in"
                pendingLabel="Signing in..."
              />
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthFormShell>
  );
}
