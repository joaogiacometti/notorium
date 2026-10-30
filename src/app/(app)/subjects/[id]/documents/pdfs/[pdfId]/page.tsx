import { redirect } from "next/navigation";
import { PdfDetail } from "@/components/pdfs/pdf-detail";
import { getPdfByIdForUser } from "@/features/pdfs/queries";
import { getSubjectByIdForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";

interface PdfPageProps {
  params: Promise<{ id: string; pdfId: string }>;
}

export default async function PdfPage({ params }: Readonly<PdfPageProps>) {
  const session = await requireSession();

  const { id, pdfId } = await params;
  const [pdf, subject] = await Promise.all([
    getPdfByIdForUser(session.user.id, pdfId),
    getSubjectByIdForUser(session.user.id, id),
  ]);

  if (!pdf) {
    redirect("/");
  }

  if (pdf.subjectId !== id) {
    redirect(
      getDocumentDetailHref({
        kind: "pdf",
        subjectId: pdf.subjectId,
        id: pdf.id,
      }),
    );
  }

  return (
    <main>
      <PdfDetail
        pdf={{
          id: pdf.id,
          title: pdf.title,
          subjectId: pdf.subjectId,
          fileName: pdf.fileName,
          blobPathname: pdf.blobPathname,
          lastPage: pdf.lastPage,
        }}
        subjectName={subject?.name ?? ""}
      />
    </main>
  );
}
