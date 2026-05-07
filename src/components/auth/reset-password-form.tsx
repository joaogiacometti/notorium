"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { resetPasswordAction } from "@/app/actions/auth";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { PasswordField } from "@/components/auth/password-field";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import { cn } from "@/lib/utils";
import {
  type ResetPasswordForm as ResetPasswordFormValues,
  resetPasswordSchema,
} from "@/lib/validations/auth";

export function ResetPasswordForm({
  token,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  token: string;
}) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: "",
      confirmPassword: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: ResetPasswordFormValues) {
    const result = await resetPasswordAction(data);
    if (result && !result.success) {
      toast.error(resolveActionErrorMessage(result));
      return;
    }

    toast.success("Password reset. You can sign in now.");
    router.push("/login");
  }

  return (
    <AuthFormShell
      heading="Set a new password"
      subheading="Use a unique password you haven't used for this account before."
      footer={<Link href="/login">Back to sign in</Link>}
      className={cn(className)}
      {...props}
    >
      <form id="form-reset-password" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4 md:gap-6">
          <input type="hidden" {...form.register("token")} />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <PasswordField
                id="form-reset-password-password"
                label="New password"
                value={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
                autoComplete="new-password"
                invalid={fieldState.invalid}
                error={fieldState.error}
                helperText="Use at least 8 characters."
              />
            )}
          />
          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <PasswordField
                id="form-reset-password-confirm-password"
                label="Confirm new password"
                value={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
                autoComplete="new-password"
                invalid={fieldState.invalid}
                error={fieldState.error}
                helperText="Re-enter your new password exactly."
              />
            )}
          />
          <Field>
            <Button
              type="submit"
              form="form-reset-password"
              disabled={isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={isSubmitting}
                idleLabel="Reset password"
                pendingLabel="Resetting password..."
              />
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthFormShell>
  );
}
