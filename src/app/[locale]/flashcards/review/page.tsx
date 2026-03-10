import { redirect } from "next/navigation";

interface FlashcardReviewPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ subjectId?: string }>;
}

export default async function FlashcardReviewPage({
  params,
  searchParams,
}: Readonly<FlashcardReviewPageProps>) {
  const { locale } = await params;
  const { subjectId } = await searchParams;
  const query = new URLSearchParams();
  query.set("view", "review");

  if (typeof subjectId === "string") {
    query.set("subjectId", subjectId);
  }

  redirect(`/${locale}/flashcards?${query.toString()}`);
}
