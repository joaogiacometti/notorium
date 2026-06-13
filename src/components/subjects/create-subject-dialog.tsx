"use client";

import { createSubject } from "@/app/actions/subjects";
import { SubjectDialogForm } from "@/components/subjects/subject-dialog-form";
import { DEFAULT_SUBJECT_KIND } from "@/features/subjects/constants";
import type { CreateSubjectForm } from "@/features/subjects/validation";

interface CreateSubjectDialogProps {
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function getCreateSubjectFormValues(): CreateSubjectForm {
  return {
    name: "",
    kind: DEFAULT_SUBJECT_KIND,
  };
}

export function CreateSubjectDialog({
  trigger,
  open,
  onOpenChange,
  onCreated,
}: Readonly<CreateSubjectDialogProps>) {
  return (
    <SubjectDialogForm
      mode="create"
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      values={getCreateSubjectFormValues()}
      onSubmitAction={(values) => createSubject(values as CreateSubjectForm)}
      onSuccess={() => {
        onCreated?.();
      }}
    />
  );
}
