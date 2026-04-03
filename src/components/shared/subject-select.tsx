"use client";

import { SubjectText } from "@/components/shared/subject-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubjectEntity } from "@/lib/server/api-contracts";

interface SubjectSelectProps {
  value: string;
  onChange: (value: string) => void;
  subjects: SubjectEntity[];
  placeholder?: string;
  id?: string;
  label?: string;
  error?: string;
  ariaInvalid?: boolean;
}

export function SubjectSelect({
  value,
  onChange,
  subjects,
  placeholder = "Select a subject",
  id,
  label = "Subject",
  error,
  ariaInvalid,
}: SubjectSelectProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-invalid={ariaInvalid}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {subjects.map((subject) => (
            <SelectItem key={subject.id} value={subject.id}>
              <SubjectText
                value={subject.name}
                mode="truncate"
                className="block max-w-full"
              />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  );
}
