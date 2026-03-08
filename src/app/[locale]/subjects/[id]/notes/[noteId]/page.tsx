import { notFound } from "next/navigation";
import { NoteDetail } from "@/components/note-detail";
import { getNoteByIdForUser } from "@/features/notes/queries";
import { requireSession } from "@/lib/auth";

interface NotePageProps {
  params: Promise<{ id: string; noteId: string }>;
}

export default async function NotePage({ params }: NotePageProps) {
  const session = await requireSession();

  const { noteId } = await params;
  const note = await getNoteByIdForUser(session.user.id, noteId);

  if (!note) {
    notFound();
  }

  return (
    <main>
      <NoteDetail note={note} />
    </main>
  );
}
