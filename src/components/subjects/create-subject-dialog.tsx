"use client";

import { createSubject } from "@/app/actions/subjects";
import { SubjectDialogForm } from "@/components/subjects/subject-dialog-form";
import { DEFAULT_SUBJECT_KIND } from "@/features/subjects/constants";
import type { CreateSubjectForm } from "@/features/subjects/validation";

interface CreateSubjectDialogProps {
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the new subject is nested under this parent (a subfolder). */
  parentSubjectId?: string;
  onCreated?: () => void;
}

function getCreateSubjectFormValues(isSubfolder: boolean): CreateSubjectForm {
  return {
    name: "",
    kind: isSubfolder ? "general" : DEFAULT_SUBJECT_KIND,
  };
}

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
      hideKind={isSubfolder}
      title={isSubfolder ? "Create Subfolder" : undefined}
      values={getCreateSubjectFormValues(isSubfolder)}
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
