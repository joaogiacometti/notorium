import { SubjectsList } from "@/components/subjects/subjects-list";
import {
  getArchivedSubjectsForUser,
  getSubjectsForUser,
} from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

export default async function SubjectsPage() {
  const session = await requireSession();

  const [subjects, archived] = await Promise.all([
    getSubjectsForUser(session.user.id),
    getArchivedSubjectsForUser(session.user.id),
  ]);

  return (
    <main>
      <SubjectsList subjects={subjects} archivedCount={archived.length} />
    </main>
  );
}
