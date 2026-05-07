"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import { cn } from "@/lib/utils";
import {
  type RequestPasswordResetForm as RequestPasswordResetFormValues,
  requestPasswordResetSchema,
} from "@/lib/validations/auth";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: RequestPasswordResetFormValues) {
    const result = await requestPasswordResetAction(data);
    if (result && !result.success) {
      toast.error(resolveActionErrorMessage(result));
      return;
    }

    toast.success("If your account is active, a reset email will be sent.");
    router.push("/login");
  }

  return (
    <AuthFormShell
      heading="Forgot your password?"
      subheading="Enter your account email. If your account is active, we'll send a reset link."
      footer={
        <>
          Remembered it? <Link href="/login">Back to sign in</Link>
        </>
      }
      className={cn(className)}
      {...props}
    >
      <form id="form-forgot-password" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4 md:gap-6">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="form-forgot-password-email">
                  Email
                </FieldLabel>
                <Input
                  {...field}
                  id="form-forgot-password-email"
                  type="email"
                  placeholder="name@school.edu"
                  aria-invalid={fieldState.invalid}
                  autoComplete="email"
                />
                <FieldDescription>
                  For security, this confirmation is generic and never reveals
                  account status.
                </FieldDescription>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          <Field>
            <Button
              type="submit"
              form="form-forgot-password"
              disabled={isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={isSubmitting}
                idleLabel="Send reset link"
                pendingLabel="Sending reset link..."
              />
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthFormShell>
  );
}
