import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getNotesBySubject } from "@/app/actions/notes";
import { getSubjectById } from "@/app/actions/subjects";
import { SubjectDetail } from "@/components/subject-detail";
import { auth } from "@/lib/auth";

interface SubjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const [subject, notes] = await Promise.all([
    getSubjectById(id),
    getNotesBySubject(id),
  ]);

  if (!subject) {
    notFound();
  }

  return (
    <main>
      <SubjectDetail subject={subject} notes={notes} />
    </main>
  );
}
