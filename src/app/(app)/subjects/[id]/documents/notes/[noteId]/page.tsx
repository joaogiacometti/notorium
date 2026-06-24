import { redirect } from "next/navigation";
import { NoteDetail } from "@/components/notes/note-detail";
import { getNoteByIdForUser } from "@/features/notes/queries";
import { getSubjectPageHref } from "@/features/subjects/constants";
import { getSubjectByIdForUser } from "@/features/subjects/queries";
import { isAiEnabled } from "@/lib/ai/config";
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
    redirect(`/subjects/${id}`);
  }

  if (note.subjectId !== id) {
    redirect(getNoteDetailHref(note.subjectId, note.id));
  }

  return (
    <main>
      <NoteDetail
        aiEnabled={isAiEnabled()}
        note={note}
        subjectName={subject?.name ?? ""}
        subjectHref={subject ? getSubjectPageHref(subject) : null}
      />
    </main>
  );
}
