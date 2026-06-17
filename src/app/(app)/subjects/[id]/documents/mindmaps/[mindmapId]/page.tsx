import { redirect } from "next/navigation";
import { MindmapDetail } from "@/components/mindmaps/mindmap-detail";
import { getAllDecksWithPathsForUser } from "@/features/decks/queries";
import { getMindmapByIdForUser } from "@/features/mindmaps/queries";
import { getSubjectByIdForUser } from "@/features/subjects/queries";
import { isAiEnabled } from "@/lib/ai/config";
import { requireSession } from "@/lib/auth/auth";
import { getMindmapDetailHref } from "@/lib/navigation/detail-page-back-link";

interface MindmapPageProps {
  params: Promise<{ id: string; mindmapId: string }>;
}

export default async function MindmapPage({
  params,
}: Readonly<MindmapPageProps>) {
  const session = await requireSession();

  const { id, mindmapId } = await params;
  // Decks feed the editor's "Generate flashcards" action in the actions menu.
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

  const subject = await getSubjectByIdForUser(session.user.id, id);

  return (
    <main>
      <MindmapDetail
        aiEnabled={isAiEnabled()}
        decks={decks}
        mindmap={mindmap}
        subjectName={subject?.name ?? ""}
      />
    </main>
  );
}
