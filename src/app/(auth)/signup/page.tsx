import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { getOptionalSession } from "@/lib/auth/auth";

export default async function Page() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/");
  }

  return <SignupForm />;
}
