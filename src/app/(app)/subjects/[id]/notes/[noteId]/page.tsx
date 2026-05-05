import { redirect } from "next/navigation";
import { NoteDetail } from "@/components/notes/note-detail";
import { getAllDecksWithPathsForUser } from "@/features/decks/queries";
import {
  getNoteByIdForUser,
  getNotesBySubjectForUser,
} from "@/features/notes/queries";
import { isAiEnabled } from "@/lib/ai/config";
import { requireSession } from "@/lib/auth/auth";
import { resolveNoteDetailBackLink } from "@/lib/navigation/detail-page-back-link";

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
    redirect(`/subjects/${note.subjectId}/notes/${note.id}`);
  }

  const subjectNotes = await getNotesBySubjectForUser(session.user.id, id);
  const backLink = resolveNoteDetailBackLink(note.subjectId);

  return (
    <main>
      <NoteDetail
        backHref={backLink.href}
        backLabel={backLink.label}
        aiEnabled={isAiEnabled()}
        decks={decks}
        note={note}
        subjectNotes={subjectNotes}
      />
    </main>
  );
}
