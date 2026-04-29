"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { resetPasswordAction } from "@/app/actions/auth";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-4 sm:p-6 md:p-8">
          <form id="form-reset-password" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4 md:gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Choose a new password</h1>
              </div>
              <input type="hidden" {...form.register("token")} />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-reset-password-password">
                      Password
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-reset-password-password"
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
                    <FieldLabel htmlFor="form-reset-password-confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-reset-password-confirm-password"
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
                    pendingLabel="Resetting..."
                  />
                </Button>
              </Field>
              <FieldDescription className="text-center">
                <Link href="/login">Back to sign in</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
