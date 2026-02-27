import { getSubjects } from "@/app/actions/subjects";
import { SubjectsList } from "@/components/subjects-list";
import { requireSession } from "@/lib/auth";

export default async function SubjectsPage() {
  await requireSession();

  const subjects = await getSubjects();

  return (
    <main>
      <SubjectsList subjects={subjects} />
    </main>
  );
}
