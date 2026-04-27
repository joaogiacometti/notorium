import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth/auth";

export default async function Home() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/subjects");
  }

  redirect("/login");
}
