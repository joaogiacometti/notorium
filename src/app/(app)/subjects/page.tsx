import { BookOpen } from "lucide-react";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import { SubjectsList } from "@/components/subjects/subjects-list";
import { getAllSubjectsForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

type SubjectsStatusFilter = "active" | "archived" | "all";

interface SubjectsPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

function resolveSubjectsStatusFilter(status?: string): SubjectsStatusFilter {
  if (status === "archived" || status === "all") {
    return status;
  }

  return "active";
}

export default async function SubjectsPage({
  searchParams,
}: Readonly<SubjectsPageProps>) {
  const session = await requireSession();
  const { status } = await searchParams;
  const initialStatus = resolveSubjectsStatusFilter(status);

  const subjects = await getAllSubjectsForUser(session.user.id);

  return (
    <FeaturePageShell
      title="Subjects"
      description="Manage your courses and track progress."
      icon={BookOpen}
    >
      <SubjectsList initialStatus={initialStatus} subjects={subjects} />
    </FeaturePageShell>
  );
}
