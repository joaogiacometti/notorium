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
import { cn } from "@/lib/utils";

type PdfDetailRecord = Pick<
  PdfDocumentEntity,
  "id" | "title" | "folderId" | "fileName" | "blobPathname" | "lastPage"
>;

interface PdfDetailProps {
  pdf: PdfDetailRecord;
  folderName: string;
}

export function PdfDetail({ pdf, folderName }: Readonly<PdfDetailProps>) {
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
            parent: { label: folderName, icon: "folder" },
            current: { label: pdf.title },
          }}
        />
      ) : null}
      <AppPageContainer
        maxWidth="7xl"
        className={cn(
          "flex flex-col gap-2 overflow-hidden px-0 pt-2 sm:gap-4 sm:pt-6",
          isZenMode
            ? "fixed inset-0 z-immersive h-dvh max-w-none bg-background pb-0 sm:py-4"
            : "h-[calc(100dvh-3.5rem-var(--app-mobile-header-height,0rem))] pb-0 sm:pb-4 lg:pb-6",
        )}
      >
        <div className="flex min-w-0 shrink-0 items-start justify-between gap-2 px-4 sm:gap-4 sm:px-0">
          <h1 className="min-w-0 truncate text-xl leading-10 font-semibold tracking-tight sm:px-3">
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
          title={pdf.title}
          folderPath={folderName}
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
          runDocumentAction(
            queryClient,
            () => DOCUMENT_KIND_ACTIONS.pdf.rename(pdf.id, title),
            pdf.folderId,
          )
        }
        onSuccess={() => setRenameOpen(false)}
      />
      <DeleteDocumentDialog
        kindLabel={DOCUMENT_KIND_ACTIONS.pdf.label}
        title={pdf.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={() =>
          runDocumentAction(
            queryClient,
            () => DOCUMENT_KIND_ACTIONS.pdf.remove(pdf.id),
            pdf.folderId,
          )
        }
        onSuccess={() => {
          setDeleteOpen(false);
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
