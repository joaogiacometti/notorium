"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { SubjectEntity, SubjectOption } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface SubjectSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  subjects: Array<SubjectEntity | SubjectOption>;
  placeholder?: string;
  id?: string;
  label?: string;
  error?: string;
  ariaInvalid?: boolean;
  disabled?: boolean;
}

interface SubjectSelectDropdownProps {
  subjects: Array<SubjectEntity | SubjectOption>;
  value: string | null;
  listboxId: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (id: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function getSubjectLabel(subject: SubjectEntity | SubjectOption): string {
  return "path" in subject ? subject.path : subject.name;
}

function filterSubjects(
  subjects: Array<SubjectEntity | SubjectOption>,
  query: string,
): Array<SubjectEntity | SubjectOption> {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return subjects;
  return subjects.filter((subject) =>
    getSubjectLabel(subject).toLowerCase().includes(normalized),
  );
}

function SubjectSelectDropdown({
  subjects,
  value,
  listboxId,
  searchQuery,
  onSearchChange,
  onSelect,
  inputRef,
}: Readonly<SubjectSelectDropdownProps>) {
  const filtered = filterSubjects(subjects, searchQuery);

  return (
    <PopoverPortal>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            value={searchQuery}
            onValueChange={onSearchChange}
            placeholder="Search subjects by path"
          />
          <CommandList id={listboxId}>
            <CommandEmpty>No subjects found.</CommandEmpty>
            {filtered.map((subject) => {
              const subjectLabel = getSubjectLabel(subject);
              const isSelected = subject.id === value;

              return (
                <CommandItem
                  key={subject.id}
                  value={subjectLabel}
                  onSelect={() => onSelect(subject.id)}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{subjectLabel}</span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </PopoverPortal>
  );
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
  disabled,
}: Readonly<SubjectSelectProps>) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();

  const selectedSubject =
    subjects.find((subject) => subject.id === value) ?? null;

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    inputRef.current?.focus();
  }, [open]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setSearchQuery("");
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {/* Popover open is forced false when disabled to prevent state drift from keyboard/programmatic triggers */}
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-expanded={open}
            data-invalid={ariaInvalid ? "true" : undefined}
            disabled={disabled}
            className={cn(
              "border-input data-[placeholder=true]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 data-invalid:ring-destructive/20 data-invalid:border-destructive inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            )}
            data-placeholder={selectedSubject ? undefined : "true"}
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {selectedSubject ? getSubjectLabel(selectedSubject) : placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <SubjectSelectDropdown
          subjects={subjects}
          value={value}
          listboxId={listboxId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={handleSelect}
          inputRef={inputRef}
        />
      </Popover>
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  );
}
