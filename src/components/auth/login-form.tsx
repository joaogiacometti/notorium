"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Clock3 } from "lucide-react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { loginAction } from "@/app/actions/auth";
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
  type LoginForm as LoginFormValues,
  loginSchema,
} from "@/lib/validations/auth";

export function LoginForm({
  showPendingApprovalNotice = false,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  showPendingApprovalNotice?: boolean;
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
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            id="form-login"
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-4 sm:p-6 md:p-8"
          >
            <FieldGroup className="gap-4 md:gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Login to your account</h1>
              </div>
              {showPendingApprovalNotice ? (
                <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="text-left text-foreground/90">
                    Your account was created successfully and is now waiting for
                    administrator approval.
                  </p>
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
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="form-login-password">
                        Password
                      </FieldLabel>
                      <span className="ml-auto text-sm text-muted-foreground">
                        Forgot your password?
                      </span>
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
                <Button
                  type="submit"
                  form="form-login"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <AsyncButtonContent
                    pending={isSubmitting}
                    idleLabel="Login"
                    pendingLabel="Logging in..."
                  />
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Don&apos;t have an account? <Link href="/signup">Sign up</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-muted/40 to-background" />
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
