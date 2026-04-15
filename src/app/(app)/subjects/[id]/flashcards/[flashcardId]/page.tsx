import { redirect } from "next/navigation";

interface FlashcardPageProps {
  params: Promise<{ id: string; flashcardId: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function FlashcardPage({
  params,
  searchParams,
}: Readonly<FlashcardPageProps>) {
  const { flashcardId } = await params;
  const { from } = await searchParams;

  const query = from ? `?from=${encodeURIComponent(from)}` : "";
  redirect(`/flashcards/${flashcardId}${query}`);
}
