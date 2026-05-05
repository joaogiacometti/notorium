import { redirect } from "next/navigation";

export default async function ArchivedSubjectsPage() {
  redirect("/subjects?status=archived");
}
