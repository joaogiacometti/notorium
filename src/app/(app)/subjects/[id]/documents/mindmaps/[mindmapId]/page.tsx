import { redirect } from "next/navigation";
import { MindmapDetail } from "@/components/mindmaps/mindmap-detail";
import { getMindmapByIdForUser } from "@/features/mindmaps/queries";
import { getSubjectPageHref } from "@/features/subjects/constants";
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
  const [mindmap, subject] = await Promise.all([
    getMindmapByIdForUser(session.user.id, mindmapId),
    getSubjectByIdForUser(session.user.id, id),
  ]);

  if (!mindmap) {
    redirect("/");
  }

  if (mindmap.subjectId !== id) {
    redirect(getMindmapDetailHref(mindmap.subjectId, mindmap.id));
  }

  return (
    <main>
      <MindmapDetail
        aiEnabled={isAiEnabled()}
        mindmap={mindmap}
        subjectName={subject?.name ?? ""}
        subjectHref={subject ? getSubjectPageHref(subject) : null}
      />
    </main>
  );
}
