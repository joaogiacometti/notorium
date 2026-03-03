import { redirect } from "next/navigation";
import { SignupForm } from "@/components/signup-form";
import { getOptionalSession } from "@/lib/auth";

export default async function Page() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center bg-background px-3 p-6">
      <div className="w-full max-w-sm md:max-w-4xl">
        <SignupForm />
      </div>
    </div>
  );
}
