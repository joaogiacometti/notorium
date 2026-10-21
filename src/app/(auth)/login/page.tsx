import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getOptionalSession } from "@/lib/auth/auth";
import { isEmailDeliveryEnabled } from "@/lib/email/config";

interface LoginPageProps {
  searchParams: Promise<{ pendingApproval?: string }>;
}

export default async function Page({ searchParams }: Readonly<LoginPageProps>) {
  const session = await getOptionalSession();
  const { pendingApproval } = await searchParams;

  if (session) {
    redirect("/");
  }

  return (
    <LoginForm
      showForgotPasswordLink={isEmailDeliveryEnabled()}
      showPendingApprovalNotice={pendingApproval === "1"}
    />
  );
}
