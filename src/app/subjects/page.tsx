import { getSubjects } from "@/app/actions/subjects";
import { SubjectsList } from "@/components/subjects-list";
import { requireSession } from "@/lib/auth";
import type { UserPlan } from "@/lib/plan-limits";

export default async function SubjectsPage() {
  const session = await requireSession();

  const subjects = await getSubjects();

  return (
    <main>
      <SubjectsList
        subjects={subjects}
        plan={(session.user.plan ?? "free") as UserPlan}
      />
    </main>
  );
}
