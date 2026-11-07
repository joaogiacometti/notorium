import { NoteDetailLoading } from "@/components/notes/note-detail-loading";

// Note links resolve here before redirecting to the note's subject, so show
// the note skeleton instead of falling back to the Home dashboard's.
export default function NoteLinkLoading() {
  return <NoteDetailLoading />;
}
