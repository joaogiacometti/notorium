import { redirect } from "next/navigation";
import { NoteDetail } from "@/components/notes/note-detail";
import { getAllDecksWithPathsForUser } from "@/features/decks/queries";
import { getNoteByIdForUser } from "@/features/notes/queries";
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
  const [note, decks] = await Promise.all([
    getNoteByIdForUser(session.user.id, noteId),
    getAllDecksWithPathsForUser(session.user.id),
  ]);

  if (!note) {
    redirect(`/subjects/${id}`);
  }

  if (note.subjectId !== id) {
    redirect(getNoteDetailHref(note.subjectId, note.id));
  }

  const subject = await getSubjectByIdForUser(session.user.id, id);

  return (
    <main>
      <NoteDetail
        aiEnabled={isAiEnabled()}
        decks={decks}
        note={note}
        subjectName={subject?.name ?? ""}
      />
    </main>
  );
}
