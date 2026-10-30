"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Download, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DeleteDocumentDialog } from "@/components/documents/delete-document-dialog";
import {
  DOCUMENT_KIND_ACTIONS,
  runDocumentAction,
} from "@/components/documents/document-kind-actions";
import { RenameDocumentDialog } from "@/components/documents/rename-document-dialog";
import { ZenModeToggle } from "@/components/documents/zen-mode-toggle";
import { LazyPdfReader } from "@/components/pdfs/lazy-pdf-reader";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBar } from "@/components/shared/page-top-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAttachmentReadUrl } from "@/features/attachments/pathname";
import type { PdfDocumentEntity } from "@/features/pdfs/types";
import { useZenMode } from "@/lib/editor/use-zen-mode";
import { notifySubjectDocumentsChanged } from "@/lib/trees/subject-documents-events";
import { cn } from "@/lib/utils";

type PdfDetailRecord = Pick<
  PdfDocumentEntity,
  "id" | "title" | "subjectId" | "fileName" | "blobPathname" | "lastPage"
>;

interface PdfDetailProps {
  pdf: PdfDetailRecord;
  subjectName: string;
}

export function PdfDetail({ pdf, subjectName }: Readonly<PdfDetailProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startNavTransition] = useTransition();
  const { isZenMode, toggleZenMode } = useZenMode();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileUrl = getAttachmentReadUrl(pdf.blobPathname);

  return (
    <>
      {!isZenMode ? (
        <PageTopBar
          breadcrumb={{
            parent: { label: subjectName, icon: "book-open" },
            current: { label: pdf.title },
          }}
        />
      ) : null}
      <AppPageContainer
        maxWidth="7xl"
        className={cn(
          "flex flex-col gap-4 overflow-hidden",
          isZenMode
            ? "fixed inset-0 z-immersive h-svh max-w-none bg-background py-4"
            : "h-[calc(100svh-3.5rem)] pb-4 lg:pb-6",
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
          <h1 className="min-w-0 truncate px-3 text-xl leading-10 font-semibold tracking-tight">
            {pdf.title}
          </h1>
          <div className="flex shrink-0 gap-2">
            <ZenModeToggle
              isZenMode={isZenMode}
              onToggle={toggleZenMode}
              className="size-10"
            />
            <PdfActionsMenu
              downloadUrl={fileUrl}
              fileName={pdf.fileName}
              onRename={() => setRenameOpen(true)}
              onDelete={() => setDeleteOpen(true)}
            />
          </div>
        </div>
        <LazyPdfReader
          pdfId={pdf.id}
          fileUrl={fileUrl}
          initialPage={pdf.lastPage}
        />
      </AppPageContainer>

      <RenameDocumentDialog
        kindLabel={DOCUMENT_KIND_ACTIONS.pdf.label}
        title={pdf.title}
        titleSchema={DOCUMENT_KIND_ACTIONS.pdf.titleSchema}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onRename={(title) =>
          runDocumentAction(queryClient, () =>
            DOCUMENT_KIND_ACTIONS.pdf.rename(pdf.id, title),
          )
        }
        onSuccess={() => notifySubjectDocumentsChanged(pdf.subjectId)}
      />
      <DeleteDocumentDialog
        kindLabel={DOCUMENT_KIND_ACTIONS.pdf.label}
        title={pdf.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={() =>
          runDocumentAction(queryClient, () =>
            DOCUMENT_KIND_ACTIONS.pdf.remove(pdf.id),
          )
        }
        onSuccess={() => {
          setDeleteOpen(false);
          notifySubjectDocumentsChanged(pdf.subjectId);
          startNavTransition(() => router.push("/"));
        }}
      />
    </>
  );
}

interface PdfActionsMenuProps {
  downloadUrl: string;
  fileName: string;
  onRename: () => void;
  onDelete: () => void;
}

function PdfActionsMenu({
  downloadUrl,
  fileName,
  onRename,
  onDelete,
}: Readonly<PdfActionsMenuProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="size-10 shrink-0"
          aria-label="Open PDF actions"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onClick={onRename}>
          <Pencil className="size-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <a href={downloadUrl} download={fileName}>
            <Download className="size-4" />
            Download
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
