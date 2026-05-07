import Link from "next/link";
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
  const hasTokenError = Boolean(error);
  const recoveryMessage = hasTokenError
    ? "This reset link is invalid or expired."
    : "A reset link is required to continue.";

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center bg-background px-3 p-6">
      <div className="w-full max-w-sm md:max-w-4xl">
        {resetToken && !error ? (
          <ResetPasswordForm token={resetToken} />
        ) : (
          <div className="rounded-xl border bg-card p-6 text-center">
            <h1 className="text-2xl font-bold">Reset link unavailable</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {recoveryMessage}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Request a new reset email and open the latest link.
            </p>
            <p className="mt-4 text-sm">
              <Link
                href="/forgot-password"
                className="rounded-sm text-foreground/90 underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Request a new reset link
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
