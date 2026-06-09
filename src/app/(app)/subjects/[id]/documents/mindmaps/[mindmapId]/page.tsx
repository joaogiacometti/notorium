import { redirect } from "next/navigation";
import { MindmapDetail } from "@/components/mindmaps/mindmap-detail";
import { getSubjectDocumentsForUser } from "@/features/documents/queries";
import { getMindmapByIdForUser } from "@/features/mindmaps/queries";
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
  const mindmap = await getMindmapByIdForUser(session.user.id, mindmapId);

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
        backHref={getSubjectDocumentsHref(id)}
        mindmap={mindmap}
        documents={documents}
      />
    </main>
  );
}
