import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSubjects } from "@/app/actions/subjects";
import { SubjectsList } from "@/components/subjects-list";
import { auth } from "@/lib/auth";

export default async function SubjectsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const subjects = await getSubjects();

  return (
    <main>
      <SubjectsList subjects={subjects} />
    </main>
  );
}
