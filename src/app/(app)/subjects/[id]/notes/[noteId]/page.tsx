import { redirect } from "next/navigation";
import { NoteDetail } from "@/components/notes/note-detail";
import { getNoteByIdForUser } from "@/features/notes/queries";
import { requireSession } from "@/lib/auth/auth";
import { resolveNoteDetailBackLink } from "@/lib/navigation/detail-page-back-link";

interface NotePageProps {
  params: Promise<{ id: string; noteId: string }>;
}

export default async function NotePage({ params }: NotePageProps) {
  const session = await requireSession();

  const { id, noteId } = await params;
  const note = await getNoteByIdForUser(session.user.id, noteId);

  if (!note) {
    redirect(`/subjects/${id}`);
  }

  const backLink = resolveNoteDetailBackLink(note.subjectId);

  return (
    <main>
      <NoteDetail
        backHref={backLink.href}
        backLabel={backLink.label}
        note={note}
      />
    </main>
  );
}
