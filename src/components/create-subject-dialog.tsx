"use client";

import { createSubject } from "@/app/actions/subjects";
import { SubjectDialogForm } from "@/components/subject-dialog-form";
import type { CreateSubjectForm } from "@/lib/validations/subjects";

interface CreateSubjectDialogProps {
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getCreateSubjectFormValues(): CreateSubjectForm {
  return {
    name: "",
    description: "",
  };
}

export function CreateSubjectDialog({
  trigger,
  open,
  onOpenChange,
}: Readonly<CreateSubjectDialogProps>) {
  return (
    <SubjectDialogForm
      mode="create"
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      values={getCreateSubjectFormValues()}
      onSubmitAction={(values) => createSubject(values as CreateSubjectForm)}
    />
  );
}
