import { redirect } from "next/navigation";
import { MindmapDetail } from "@/components/mindmaps/mindmap-detail";
import { getMindmapByIdForUser } from "@/features/mindmaps/queries";
import { getSubjectPageHref } from "@/features/subjects/constants";
import {
  getAllSubjectsWithPathsForUser,
  getSubjectByIdForUser,
} from "@/features/subjects/queries";
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
  // Subjects feed the editor's "Generate flashcards" action in the actions menu.
  const [mindmap, subjects] = await Promise.all([
    getMindmapByIdForUser(session.user.id, mindmapId),
    getAllSubjectsWithPathsForUser(session.user.id),
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
        subjects={subjects}
        mindmap={mindmap}
        subjectName={subject?.name ?? ""}
        subjectHref={subject ? getSubjectPageHref(subject) : null}
      />
    </main>
  );
}
