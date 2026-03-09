import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { getOptionalSession } from "@/lib/auth/auth";

export default async function Page() {
  const session = await getOptionalSession();
  const locale = await getLocale();

  if (session) {
    redirect(`/${locale}`);
  }

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center bg-background px-3 p-6">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  );
}
