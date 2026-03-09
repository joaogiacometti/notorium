"use client";

import { editSubject } from "@/app/actions/subjects";
import { SubjectDialogForm } from "@/components/subjects/subject-dialog-form";
import type { EditSubjectForm } from "@/features/subjects/validation";
import type { SubjectEditDto } from "@/lib/server/api-contracts";

interface EditSubjectDialogProps {
  subject: SubjectEditDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getEditSubjectFormValues(subject: SubjectEditDto): EditSubjectForm {
  return {
    id: subject.id,
    name: subject.name,
    description: subject.description ?? "",
  };
}

export function EditSubjectDialog({
  subject,
  open,
  onOpenChange,
}: Readonly<EditSubjectDialogProps>) {
  return (
    <SubjectDialogForm
      mode="edit"
      open={open}
      onOpenChange={onOpenChange}
      values={getEditSubjectFormValues(subject)}
      onSubmitAction={(values) => editSubject(values as EditSubjectForm)}
    />
  );
}
