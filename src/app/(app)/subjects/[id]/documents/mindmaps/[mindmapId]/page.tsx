import { redirect } from "next/navigation";
import { MindmapDetail } from "@/components/mindmaps/mindmap-detail";
import { getAllDecksWithPathsForUser } from "@/features/decks/queries";
import { getSubjectDocumentsForUser } from "@/features/documents/queries";
import { getMindmapByIdForUser } from "@/features/mindmaps/queries";
import { isAiEnabled } from "@/lib/ai/config";
import { requireSession } from "@/lib/auth/auth";
import {
  getMindmapDetailHref,
  getSubjectDocumentsHref,
} from "@/lib/navigation/detail-page-back-link";

interface MindmapPageProps {
  params: Promise<{ id: string; mindmapId: string }>;
}

export default async function MindmapPage({
  params,
}: Readonly<MindmapPageProps>) {
  const session = await requireSession();

  const { id, mindmapId } = await params;
  // Decks feed the sidebar's note "Generate flashcards" action, which works
  // from the mindmap editor too since the documents sidebar mixes both kinds.
  const [mindmap, decks] = await Promise.all([
    getMindmapByIdForUser(session.user.id, mindmapId),
    getAllDecksWithPathsForUser(session.user.id),
  ]);

  if (!mindmap) {
    redirect(`/subjects/${id}`);
  }

  if (mindmap.subjectId !== id) {
    redirect(getMindmapDetailHref(mindmap.subjectId, mindmap.id));
  }

  const documents = await getSubjectDocumentsForUser(session.user.id, id);

  return (
    <main>
      <MindmapDetail
        aiEnabled={isAiEnabled()}
        backHref={getSubjectDocumentsHref(id)}
        decks={decks}
        mindmap={mindmap}
        documents={documents}
      />
    </main>
  );
}
