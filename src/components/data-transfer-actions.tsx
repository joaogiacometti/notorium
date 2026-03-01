"use client";

import { ChevronDown, Download, Loader2, Upload } from "lucide-react";
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
        toast.success("Data exported successfully.");
      } catch {
        toast.error("Failed to export data.");
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
          toast.success(
            `Imported ${result.imported} subject${result.imported === 1 ? "" : "s"} successfully.`,
          );
        }
      } catch {
        toast.error("Failed to read the import file.");
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
              Export Data
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleExport(false)}>
              Export All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport(true)}>
              Export Template
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
          Import Data
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
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription>
              This will create new subjects from the import file with all their
              notes, attendance records, and assessments. Existing data will not
              be modified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleImportCancel}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button onClick={handleImportConfirm} disabled={isImporting}>
              {isImporting && <Loader2 className="size-4 animate-spin" />}
              Confirm Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
