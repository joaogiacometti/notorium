import { redirect } from "next/navigation";
import { SignupForm } from "@/components/signup-form";
import { getOptionalSession } from "@/lib/auth";

export default async function Page() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  );
}
