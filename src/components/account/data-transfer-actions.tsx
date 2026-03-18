"use client";

import { ChevronDown, Download, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { exportData, importData } from "@/app/actions/data-transfer";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

function downloadJson(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTransferActions() {
  const t = useTranslations("DataTransferActions");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ServerActions");
  const [isExporting, startExport] = useTransition();
  const [isImporting, startImport] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusy = isExporting || isImporting;

  function handleExport(templateOnly: boolean) {
    startExport(async () => {
      try {
        const result = await exportData({ templateOnly });
        if ("success" in result && result.success === false) {
          toast.error(resolveActionErrorMessage(result, tErrors));
          return;
        }

        const suffix = templateOnly ? "template" : "full";
        const filename = `notorium-export-${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
        downloadJson(result, filename);
        toast.success(t("export_success"));
      } catch {
        toast.error(t("export_error"));
      }
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFileRef.current = file;
    setConfirmOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleImportConfirm() {
    const file = pendingFileRef.current;
    if (!file) return;

    startImport(async () => {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const result = await importData(json);

        if (result.success) {
          toast.success(t("import_success", { count: result.imported ?? 0 }));
        } else {
          toast.error(resolveActionErrorMessage(result, tErrors));
        }
      } catch {
        toast.error(t("import_read_error"));
      } finally {
        pendingFileRef.current = null;
        setConfirmOpen(false);
      }
    });
  }

  function handleImportCancel() {
    pendingFileRef.current = null;
    setConfirmOpen(false);
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isBusy}>
              <AsyncButtonContent
                pending={isExporting}
                idleLabel={t("export_data")}
                pendingLabel={tCommon("exporting")}
                idleIcon={<Download className="size-4" />}
              />
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleExport(false)}>
              {t("export_all")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport(true)}>
              {t("export_template")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
        >
          <AsyncButtonContent
            pending={isImporting}
            idleLabel={t("import_data")}
            pendingLabel={tCommon("importing")}
            idleIcon={<Upload className="size-4" />}
          />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <Dialog open={confirmOpen} onOpenChange={handleImportCancel}>
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
              onClick={handleImportCancel}
              disabled={isImporting}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleImportConfirm} disabled={isImporting}>
              <AsyncButtonContent
                pending={isImporting}
                idleLabel={t("confirm_import")}
                pendingLabel={tCommon("importing")}
              />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
