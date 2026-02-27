import { notFound } from "next/navigation";
import { getNoteById } from "@/app/actions/notes";
import { NoteDetail } from "@/components/note-detail";
import { requireSession } from "@/lib/auth";

interface NotePageProps {
  params: Promise<{ id: string; noteId: string }>;
}

export default async function NotePage({ params }: NotePageProps) {
  await requireSession();

  const { noteId } = await params;
  const note = await getNoteById(noteId);

  if (!note) {
    notFound();
  }

  return (
    <main>
      <NoteDetail note={note} />
    </main>
  );
}
