import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export default async function Home() {
  await requireSession();
  redirect("/subjects");
}
