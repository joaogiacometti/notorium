"use client";

import { createSubject } from "@/app/actions/subjects";
import { SubjectDialogForm } from "@/components/subjects/subject-dialog-form";
import type { CreateSubjectForm } from "@/features/subjects/validation";

interface CreateSubjectDialogProps {
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the new subject is nested under this parent (a subfolder). */
  parentSubjectId?: string;
  onCreated?: () => void;
}

const EMPTY_CREATE_SUBJECT_VALUES: CreateSubjectForm = { name: "" };

export function CreateSubjectDialog({
  trigger,
  open,
  onOpenChange,
  parentSubjectId,
  onCreated,
}: Readonly<CreateSubjectDialogProps>) {
  const isSubfolder = parentSubjectId !== undefined;

  return (
    <SubjectDialogForm
      mode="create"
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={isSubfolder ? "Create Subfolder" : undefined}
      values={EMPTY_CREATE_SUBJECT_VALUES}
      onSubmitAction={(values) =>
        createSubject({
          ...(values as CreateSubjectForm),
          parentSubjectId,
        })
      }
      onSuccess={() => {
        onCreated?.();
      }}
    />
  );
}
