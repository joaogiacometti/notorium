"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FlashcardsView } from "@/features/flashcards/view";
import type { SubjectOption } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface SubjectScopeFilterProps {
  subjects: SubjectOption[];
  view: FlashcardsView;
  selectedSubjectId?: string;
  className?: string;
}

const allSubjectsValue = "__all_subjects__";

/**
 * Subject filter for the flashcards hub. Replaces the old in-page deck tree:
 * picking a subject scopes the current view to that subject (and descendants)
 * by setting `?subjectId`; "All subjects" clears the filter.
 *
 * @example
 * <SubjectScopeFilter subjects={subjects} view="manage" selectedSubjectId="s-1" />
 */
export function SubjectScopeFilter({
  subjects,
  view,
  selectedSubjectId,
  className,
}: Readonly<SubjectScopeFilterProps>) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedSubject = subjects.find(
    (subject) => subject.id === selectedSubjectId,
  );
  const selectedLabel = selectedSubject?.path ?? "All subjects";
  const filteredSubjects = getFilteredSubjects(subjects, searchQuery);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    inputRef.current?.focus();
  }, [open]);

  function handleSelect(value: string) {
    const nextSubjectId = value === allSubjectsValue ? undefined : value;
    setOpen(false);
    setSearchQuery("");

    if (nextSubjectId === selectedSubjectId) {
      return;
    }

    startTransition(() => {
      router.replace(getScopeHref(view, nextSubjectId));
    });
  }

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      data-testid="subject-scope-filter"
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label="Filter by subject"
            className="inline-flex h-9 w-full max-w-xs items-center justify-between gap-2 rounded-md border border-border/70 bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {selectedLabel}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command shouldFilter={false}>
            <CommandInput
              ref={inputRef}
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search subject paths"
            />
            <CommandList>
              <CommandEmpty>No subjects found.</CommandEmpty>
              <ScopeCommandItem
                value={allSubjectsValue}
                label="All subjects"
                selected={!selectedSubjectId}
                onSelect={handleSelect}
              />
              {filteredSubjects.map((subject) => (
                <ScopeCommandItem
                  key={subject.id}
                  value={subject.id}
                  label={subject.path}
                  selected={subject.id === selectedSubjectId}
                  onSelect={handleSelect}
                />
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ScopeCommandItem({
  value,
  label,
  selected,
  onSelect,
}: Readonly<{
  value: string;
  label: string;
  selected: boolean;
  onSelect: (value: string) => void;
}>) {
  return (
    <CommandItem
      value={label}
      onSelect={() => onSelect(value)}
      className="gap-2"
    >
      <Check
        className={cn(
          "size-4 shrink-0",
          selected ? "opacity-100" : "opacity-0",
        )}
      />
      <span className="truncate">{label}</span>
    </CommandItem>
  );
}

function getFilteredSubjects(subjects: SubjectOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return subjects;
  }

  return subjects.filter((subject) =>
    subject.path.toLowerCase().includes(normalizedQuery),
  );
}

function getScopeHref(view: FlashcardsView, subjectId?: string) {
  const params = new URLSearchParams();
  params.set("view", view);

  if (subjectId) {
    params.set("subjectId", subjectId);
  }

  return `/flashcards?${params.toString()}`;
}
