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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubjectEntity } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface ImportFlashcardsButtonProps {
  subjectId?: string;
  subjects?: SubjectEntity[];
  disabled?: boolean;
  onImported?: () => void | Promise<void>;
}

export function ImportFlashcardsButton({
  subjectId,
  subjects,
  disabled = false,
  onImported,
}: Readonly<ImportFlashcardsButtonProps>) {
  const t = useTranslations("FlashcardsList");
  const tErrors = useTranslations("ServerActions");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isImporting, startImport] = useTransition();
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId ?? "");
  const pendingFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    pendingFileRef.current = file;
    setSelectedSubjectId(subjectId ?? "");
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
    if (!file || selectedSubjectId.length === 0) {
      return;
    }

    startImport(async () => {
      try {
        const formData = new FormData();
        formData.set("subjectId", selectedSubjectId);
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
          {subjects && subjects.length > 0 ? (
            <div className="space-y-2">
              <label
                htmlFor="flashcards-import-subject"
                className="text-sm font-medium"
              >
                {t("import_subject")}
              </label>
              <Select
                value={selectedSubjectId}
                onValueChange={setSelectedSubjectId}
              >
                <SelectTrigger id="flashcards-import-subject">
                  <SelectValue placeholder={t("import_subject_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isImporting}
            >
              {t("import_cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isImporting || selectedSubjectId.length === 0}
            >
              {isImporting && <Loader2 className="size-4 animate-spin" />}
              {t("import_confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
