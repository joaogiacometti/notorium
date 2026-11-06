import { redirect } from "next/navigation";
import { PdfDetail } from "@/components/pdfs/pdf-detail";
import { getFolderByIdForUser } from "@/features/folders/queries";
import { getPdfByIdForUser } from "@/features/pdfs/queries";
import { requireSession } from "@/lib/auth/auth";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";

interface PdfPageProps {
  params: Promise<{ id: string; pdfId: string }>;
}

export default async function PdfPage({ params }: Readonly<PdfPageProps>) {
  const session = await requireSession();

  const { id, pdfId } = await params;
  const [pdf, folder] = await Promise.all([
    getPdfByIdForUser(session.user.id, pdfId),
    getFolderByIdForUser(session.user.id, id),
  ]);

  if (!pdf) {
    redirect("/");
  }

  if (pdf.folderId !== id) {
    redirect(
      getDocumentDetailHref({
        kind: "pdf",
        folderId: pdf.folderId,
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
          folderId: pdf.folderId,
          fileName: pdf.fileName,
          blobPathname: pdf.blobPathname,
          lastPage: pdf.lastPage,
        }}
        folderName={folder?.name ?? ""}
      />
    </main>
  );
}
