import { notFound } from "next/navigation";
import { NoteDetail } from "@/components/notes/note-detail";
import { resolveNoteDetailBackLink } from "@/features/navigation/detail-page-back-link";
import { getNoteByIdForUser } from "@/features/notes/queries";
import { requireSession } from "@/lib/auth/auth";

interface NotePageProps {
  params: Promise<{ id: string; noteId: string }>;
  searchParams: Promise<{ from?: string; subjectId?: string }>;
}

export default async function NotePage({
  params,
  searchParams,
}: NotePageProps) {
  const session = await requireSession();

  const { noteId } = await params;
  const returnContext = await searchParams;
  const note = await getNoteByIdForUser(session.user.id, noteId);

  if (!note) {
    notFound();
  }

  const backLink = resolveNoteDetailBackLink(returnContext, note.subjectId);

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
