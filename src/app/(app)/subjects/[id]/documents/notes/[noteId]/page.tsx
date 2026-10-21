import { redirect } from "next/navigation";
import { NoteDetail } from "@/components/notes/note-detail";
import { getNoteByIdForUser } from "@/features/notes/queries";
import { getSubjectByIdForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";
import { getNoteDetailHref } from "@/lib/navigation/detail-page-back-link";

interface NotePageProps {
  params: Promise<{ id: string; noteId: string }>;
}

export default async function NotePage({ params }: Readonly<NotePageProps>) {
  const session = await requireSession();

  const { id, noteId } = await params;
  const [note, subject] = await Promise.all([
    getNoteByIdForUser(session.user.id, noteId),
    getSubjectByIdForUser(session.user.id, id),
  ]);

  if (!note) {
    redirect("/");
  }

  if (note.subjectId !== id) {
    redirect(getNoteDetailHref(note.subjectId, note.id));
  }

  return (
    <main>
      <NoteDetail note={note} subjectName={subject?.name ?? ""} />
    </main>
  );
}
