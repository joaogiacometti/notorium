"use client";

import { createFolder } from "@/app/actions/folders";
import { FolderDialogForm } from "@/components/folders/folder-dialog-form";
import type { CreateFolderForm } from "@/features/folders/validation";

interface CreateFolderDialogProps {
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the new folder is nested under this parent (a subfolder). */
  parentFolderId?: string;
  onCreated?: () => void;
}

const EMPTY_CREATE_FOLDER_VALUES: CreateFolderForm = { name: "" };

export function CreateFolderDialog({
  trigger,
  open,
  onOpenChange,
  parentFolderId,
  onCreated,
}: Readonly<CreateFolderDialogProps>) {
  const isSubfolder = parentFolderId !== undefined;

  return (
    <FolderDialogForm
      mode="create"
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={isSubfolder ? "Create Subfolder" : undefined}
      values={EMPTY_CREATE_FOLDER_VALUES}
      onSubmitAction={(values) =>
        createFolder({
          ...(values as CreateFolderForm),
          parentFolderId,
        })
      }
      onSuccess={() => {
        onCreated?.();
      }}
    />
  );
}
