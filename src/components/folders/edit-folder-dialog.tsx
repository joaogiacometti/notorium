"use client";

import { editFolder } from "@/app/actions/folders";
import { FolderDialogForm } from "@/components/folders/folder-dialog-form";
import type { EditFolderForm } from "@/features/folders/validation";
import type { FolderEditDto } from "@/lib/server/api-contracts";

interface EditFolderDialogProps {
  folder: FolderEditDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (folder: FolderEditDto) => void;
}

function getEditFolderFormValues(folder: FolderEditDto): EditFolderForm {
  return {
    id: folder.id,
    name: folder.name,
  };
}

export function EditFolderDialog({
  folder,
  open,
  onOpenChange,
  onSaved,
}: Readonly<EditFolderDialogProps>) {
  return (
    <FolderDialogForm
      mode="edit"
      open={open}
      onOpenChange={onOpenChange}
      values={getEditFolderFormValues(folder)}
      onSubmitAction={(values) => editFolder(values as EditFolderForm)}
      onSuccess={(values) => {
        const nextValues = values as EditFolderForm;
        onSaved?.({
          id: nextValues.id,
          name: nextValues.name,
        });
      }}
    />
  );
}
