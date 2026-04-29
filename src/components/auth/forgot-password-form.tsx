"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { requestPasswordResetAction } from "@/app/actions/auth";
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-4 sm:p-6 md:p-8">
          <form
            id="form-forgot-password"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FieldGroup className="gap-4 md:gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Reset your password</h1>
              </div>
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
                      placeholder="m@example.com"
                      aria-invalid={fieldState.invalid}
                      autoComplete="email"
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
                  form="form-forgot-password"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <AsyncButtonContent
                    pending={isSubmitting}
                    idleLabel="Send reset link"
                    pendingLabel="Sending..."
                  />
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Remembered it? <Link href="/login">Sign in</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
