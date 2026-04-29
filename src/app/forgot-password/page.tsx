import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getOptionalSession } from "@/lib/auth/auth";
import { isEmailDeliveryEnabled } from "@/lib/email/config";

export default async function Page() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/subjects");
  }

  if (!isEmailDeliveryEnabled()) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center bg-background px-3 p-6">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
