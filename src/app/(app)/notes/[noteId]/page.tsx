import { notFound, redirect } from "next/navigation";
import { getNoteByIdForUser } from "@/features/notes/queries";
import { requireSession } from "@/lib/auth/auth";
import { getNoteDetailHref } from "@/lib/navigation/detail-page-back-link";

interface NoteLinkPageProps {
  params: Promise<{ noteId: string }>;
}

/** Stable target for note links, whose folder can change after they are made. */
export default async function NoteLinkPage({
  params,
}: Readonly<NoteLinkPageProps>) {
  const session = await requireSession();
  const { noteId } = await params;
  const note = await getNoteByIdForUser(session.user.id, noteId);

  if (!note) {
    notFound();
  }

  redirect(getNoteDetailHref(note.folderId, note.id));
}
