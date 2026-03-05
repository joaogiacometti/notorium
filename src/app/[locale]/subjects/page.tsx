import { getArchivedSubjects, getSubjects } from "@/app/actions/subjects";
import { SubjectsList } from "@/components/subjects-list";
import { requireSession } from "@/lib/auth";

export default async function SubjectsPage() {
  await requireSession();

  const [subjects, archived] = await Promise.all([
    getSubjects(),
    getArchivedSubjects(),
  ]);

  return (
    <main>
      <SubjectsList subjects={subjects} archivedCount={archived.length} />
    </main>
  );
}
