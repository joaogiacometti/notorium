"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { signUpAction } from "@/app/actions/auth";
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
  type SignupForm as SignupFormValues,
  signupSchema,
} from "@/lib/validations/auth";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
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
      heading="Create your Notorium account"
      subheading="Organize subjects, exams, and deadlines in one place."
      footer={
        <>
          Already have an account? <Link href="/login">Sign in</Link>
        </>
      }
      className={cn(className)}
      {...props}
    >
      <form id="form-signup" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="gap-4 md:gap-6">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="form-signup-name">Full name</FieldLabel>
                <Input
                  {...field}
                  id="form-signup-name"
                  type="text"
                  placeholder="Jordan Lee"
                  aria-invalid={fieldState.invalid}
                  autoComplete="name"
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="form-signup-email">Email</FieldLabel>
                <Input
                  {...field}
                  id="form-signup-email"
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
          <Field className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <PasswordField
                  id="form-signup-password"
                  label="Password"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  autoComplete="new-password"
                  invalid={fieldState.invalid}
                  error={fieldState.error}
                  helperText="Use 8 to 128 characters."
                />
              )}
            />
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <PasswordField
                  id="form-signup-confirm-password"
                  label="Confirm password"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  autoComplete="new-password"
                  invalid={fieldState.invalid}
                  error={fieldState.error}
                />
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
              <AsyncButtonContent
                pending={isSubmitting}
                idleLabel="Create account"
                pendingLabel="Creating account..."
              />
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </AuthFormShell>
  );
}
