import { BooksList } from "@/components/library/books-list";
import { FeaturePageShell } from "@/components/shared/feature-page-shell";
import { getBooksForUser } from "@/features/library/queries";
import { requireSession } from "@/lib/auth/auth";

export default async function LibraryPage() {
  const session = await requireSession();
  const books = await getBooksForUser(session.user.id);

  return (
    <FeaturePageShell title="Library" icon="library">
      <BooksList books={books} />
    </FeaturePageShell>
  );
}
