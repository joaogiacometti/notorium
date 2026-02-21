import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getNoteById } from "@/app/actions/notes";
import { NoteDetail } from "@/components/note-detail";
import { auth } from "@/lib/auth";

interface NotePageProps {
  params: Promise<{ id: string; noteId: string }>;
}

export default async function NotePage({ params }: NotePageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

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
