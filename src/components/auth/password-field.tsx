"use client";

import { Keyboard } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface PasswordFieldProps {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  invalid: boolean;
  error?: { message?: string };
  helperText?: string;
  trailingSlot?: ReactNode;
}

export function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onBlur,
  onChange,
  invalid,
  error,
  helperText,
  trailingSlot,
}: Readonly<PasswordFieldProps>) {
  const [capsLockActive, setCapsLockActive] = useState(false);

  function syncCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLockActive(event.getModifierState("CapsLock"));
  }

  return (
    <Field data-invalid={invalid}>
      <div className="flex items-center gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {trailingSlot ? <div className="ml-auto">{trailingSlot}</div> : null}
      </div>
      <Input
        id={id}
        type="password"
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={syncCapsLock}
        onKeyUp={syncCapsLock}
        aria-invalid={invalid}
        autoComplete={autoComplete}
      />
      {helperText ? <FieldDescription>{helperText}</FieldDescription> : null}
      {capsLockActive ? (
        <FieldDescription className="flex items-center gap-1.5">
          <Keyboard className="size-3.5" />
          Caps Lock is on.
        </FieldDescription>
      ) : null}
      {invalid ? <FieldError errors={[error]} /> : null}
    </Field>
  );
}
