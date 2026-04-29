import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getOptionalSession } from "@/lib/auth/auth";
import { isEmailDeliveryEnabled } from "@/lib/email/config";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

export default async function Page({
  searchParams,
}: Readonly<ResetPasswordPageProps>) {
  const session = await getOptionalSession();
  const { token, error } = await searchParams;

  if (session) {
    redirect("/subjects");
  }

  if (!isEmailDeliveryEnabled()) {
    redirect("/login");
  }

  const resetToken = token?.trim();

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center bg-background px-3 p-6">
      <div className="w-full max-w-sm">
        {resetToken && !error ? (
          <ResetPasswordForm token={resetToken} />
        ) : (
          <div className="rounded-xl border bg-card p-6 text-center">
            <h1 className="text-2xl font-bold">Reset link unavailable</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Request a new password reset link and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
