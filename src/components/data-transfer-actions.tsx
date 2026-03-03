"use client";

import { ChevronDown, Download, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { exportData, importData } from "@/app/actions/data-transfer";
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
  const [isExporting, startExport] = useTransition();
  const [isImporting, startImport] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusy = isExporting || isImporting;

  function handleExport(templateOnly: boolean) {
    startExport(async () => {
      try {
        const data = await exportData({ templateOnly });
        const suffix = templateOnly ? "template" : "full";
        const filename = `notorium-export-${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
        downloadJson(data, filename);
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

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(t("import_success", { count: result.imported ?? 0 }));
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
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {t("export_data")}
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
          {isImporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {t("import_data")}
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
              {isImporting && <Loader2 className="size-4 animate-spin" />}
              {t("confirm_import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
