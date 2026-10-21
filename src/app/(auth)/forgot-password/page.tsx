import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getOptionalSession } from "@/lib/auth/auth";
import { isEmailDeliveryEnabled } from "@/lib/email/config";

export default async function Page() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/");
  }

  if (!isEmailDeliveryEnabled()) {
    redirect("/login");
  }

  return <ForgotPasswordForm />;
}
