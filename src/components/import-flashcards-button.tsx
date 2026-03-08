"use client";

import { Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { importAnkiFlashcards } from "@/app/actions/flashcards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";

interface ImportFlashcardsButtonProps {
  subjectId: string;
  disabled?: boolean;
  onImported?: () => void | Promise<void>;
}

export function ImportFlashcardsButton({
  subjectId,
  disabled = false,
  onImported,
}: Readonly<ImportFlashcardsButtonProps>) {
  const t = useTranslations("FlashcardsList");
  const tErrors = useTranslations("ServerActions");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isImporting, startImport] = useTransition();
  const pendingFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    pendingFileRef.current = file;
    setConfirmOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleCancel() {
    pendingFileRef.current = null;
    setConfirmOpen(false);
  }

  function handleConfirm() {
    const file = pendingFileRef.current;
    if (!file) {
      return;
    }

    startImport(async () => {
      try {
        const formData = new FormData();
        formData.set("subjectId", subjectId);
        formData.set("file", file);
        const result = await importAnkiFlashcards(formData);

        if (!result.success) {
          toast.error(resolveActionErrorMessage(result, tErrors));
          return;
        }

        toast.success(t("import_success", { count: result.imported ?? 0 }));
        await onImported?.();
      } catch {
        toast.error(t("import_read_error"));
      } finally {
        pendingFileRef.current = null;
        setConfirmOpen(false);
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 sm:w-auto"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isImporting}
      >
        {isImporting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        <span>{t("import_flashcards")}</span>
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Dialog open={confirmOpen} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("import_dialog_title")}</DialogTitle>
            <DialogDescription>
              {t("import_dialog_description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isImporting}
            >
              {t("import_cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={isImporting}>
              {isImporting && <Loader2 className="size-4 animate-spin" />}
              {t("import_confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
