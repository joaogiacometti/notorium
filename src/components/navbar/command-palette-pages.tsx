"use client";

import { FileText, Layers, Network } from "lucide-react";
import { useEffect, useRef } from "react";
import type { OpenableDocument } from "@/app/actions/documents";
import {
  type PaletteAction,
  type PaletteCommand,
  paletteCommands,
  paletteGroupOrder,
} from "@/components/navbar/command-palette-commands";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useSmoothedLoadingState } from "@/lib/react/use-smoothed-loading-state";
import type { FlashcardManageItem } from "@/lib/server/api-contracts";

const PALETTE_LOADING_DELAY_MS = 150;
const PALETTE_LOADING_MINIMUM_VISIBLE_MS = 250;
const PALETTE_LOADING_SKELETON = (
  <div aria-hidden="true" className="space-y-2 p-2">
    <Skeleton className="h-4 w-28" />
    <div className="space-y-1">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  </div>
);

interface PaletteSearchInputProps {
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * Search box that grabs focus on mount so swapped palette pages accept typing
 * immediately.
 *
 * @example
 * <PaletteSearchInput placeholder="Select a subject..." value={s} onValueChange={setS} />
 */
export function PaletteSearchInput({
  placeholder,
  value,
  onValueChange,
}: Readonly<PaletteSearchInputProps>) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <CommandInput
      ref={inputRef}
      placeholder={placeholder}
      value={value}
      onValueChange={onValueChange}
    />
  );
}

interface RootPageProps {
  search: string;
  onSearchChange: (value: string) => void;
  onRun: (action: PaletteAction) => void;
}

/**
 * Renders the top-level command list grouped by palette section.
 *
 * @example
 * <RootPage search="" onSearchChange={setSearch} onRun={runAction} />
 */
export function RootPage({
  search,
  onSearchChange,
  onRun,
}: Readonly<RootPageProps>) {
  return (
    <>
      <PaletteSearchInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={onSearchChange}
      />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        {paletteGroupOrder.map((group) => (
          <CommandGroup key={group} heading={group}>
            {paletteCommands
              .filter((command) => command.group === group)
              .map((command) => (
                <PaletteCommandItem
                  key={command.id}
                  command={command}
                  onRun={onRun}
                />
              ))}
          </CommandGroup>
        ))}
      </CommandList>
    </>
  );
}

interface PaletteCommandItemProps {
  command: PaletteCommand;
  onRun: (action: PaletteAction) => void;
}

function PaletteCommandItem({
  command,
  onRun,
}: Readonly<PaletteCommandItemProps>) {
  const Icon = command.icon;
  return (
    <CommandItem
      value={command.label}
      keywords={command.keywords}
      onSelect={() => onRun(command.action)}
      className="cursor-pointer gap-2"
    >
      <Icon className="size-4! text-muted-foreground" />
      <span>{command.label}</span>
    </CommandItem>
  );
}

interface SubjectPickerPageProps {
  search: string;
  onSearchChange: (value: string) => void;
  subjects: { id: string; name: string }[];
  isLoading: boolean;
  onPick: (subjectId: string) => void;
}

/**
 * Renders the subject picker used before subject-scoped create dialogs.
 *
 * @example
 * <SubjectPickerPage search="" onSearchChange={setSearch} subjects={subjects} isLoading={false} onPick={setSubjectId} />
 */
export function SubjectPickerPage({
  search,
  onSearchChange,
  subjects,
  isLoading,
  onPick,
}: Readonly<SubjectPickerPageProps>) {
  const showLoadingSkeleton = useSmoothedLoadingState(isLoading, {
    delayMs: PALETTE_LOADING_DELAY_MS,
    minimumVisibleMs: PALETTE_LOADING_MINIMUM_VISIBLE_MS,
  });

  return (
    <>
      <PaletteSearchInput
        placeholder="Select a subject..."
        value={search}
        onValueChange={onSearchChange}
      />
      <CommandList>
        {showLoadingSkeleton && PALETTE_LOADING_SKELETON}
        {!isLoading && <CommandEmpty>No subjects found.</CommandEmpty>}
        <CommandGroup heading="Select a subject">
          {subjects.map((subject) => (
            <CommandItem
              key={subject.id}
              value={subject.name}
              onSelect={() => onPick(subject.id)}
              className="cursor-pointer"
            >
              {subject.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </>
  );
}

interface DocumentPickerPageProps {
  search: string;
  onSearchChange: (value: string) => void;
  documents: OpenableDocument[];
  isLoading: boolean;
  onPick: (kind: "mindmap" | "note", docId: string) => void;
}

/**
 * Renders existing notes and mindmaps that can be opened in a window.
 *
 * @example
 * <DocumentPickerPage search="" onSearchChange={setSearch} documents={documents} isLoading={false} onPick={openDocument} />
 */
export function DocumentPickerPage({
  search,
  onSearchChange,
  documents,
  isLoading,
  onPick,
}: Readonly<DocumentPickerPageProps>) {
  const showLoadingSkeleton = useSmoothedLoadingState(isLoading, {
    delayMs: PALETTE_LOADING_DELAY_MS,
    minimumVisibleMs: PALETTE_LOADING_MINIMUM_VISIBLE_MS,
  });

  return (
    <>
      <PaletteSearchInput
        placeholder="Open a document in a window..."
        value={search}
        onValueChange={onSearchChange}
      />
      <CommandList>
        {showLoadingSkeleton && PALETTE_LOADING_SKELETON}
        {!isLoading && <CommandEmpty>No documents found.</CommandEmpty>}
        <CommandGroup heading="Open in window">
          {documents.map((document) => {
            const Icon = document.kind === "mindmap" ? Network : FileText;
            return (
              <CommandItem
                key={`${document.kind}-${document.id}`}
                value={`${document.title} ${document.id}`}
                onSelect={() => onPick(document.kind, document.id)}
                className="cursor-pointer gap-2"
              >
                <Icon className="size-4! text-muted-foreground" />
                <span className="truncate">{document.title || "Untitled"}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </>
  );
}

interface FlashcardPickerPageProps {
  search: string;
  onSearchChange: (value: string) => void;
  flashcards: FlashcardManageItem[];
  isLoading: boolean;
  onPick: (flashcard: FlashcardManageItem) => void;
}

/**
 * Renders searchable flashcard results for opening the edit form in a window.
 *
 * @example
 * <FlashcardPickerPage search="" onSearchChange={setSearch} flashcards={cards} isLoading={false} onPick={openCard} />
 */
export function FlashcardPickerPage({
  search,
  onSearchChange,
  flashcards,
  isLoading,
  onPick,
}: Readonly<FlashcardPickerPageProps>) {
  const showLoadingSkeleton = useSmoothedLoadingState(isLoading, {
    delayMs: PALETTE_LOADING_DELAY_MS,
    minimumVisibleMs: PALETTE_LOADING_MINIMUM_VISIBLE_MS,
  });

  return (
    <>
      <PaletteSearchInput
        placeholder="Search flashcards to edit..."
        value={search}
        onValueChange={onSearchChange}
      />
      <CommandList>
        {showLoadingSkeleton && PALETTE_LOADING_SKELETON}
        {!isLoading && <CommandEmpty>No flashcards found.</CommandEmpty>}
        <CommandGroup heading="Edit flashcard in window">
          {flashcards.map((flashcard) => (
            <CommandItem
              key={flashcard.id}
              value={`${flashcard.frontTitle ?? flashcard.frontExcerpt} ${flashcard.subjectPath} ${flashcard.id}`}
              onSelect={() => onPick(flashcard)}
              className="cursor-pointer gap-2"
            >
              <Layers className="size-4! text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                {flashcard.frontTitle ?? flashcard.frontExcerpt}
              </span>
              <span className="max-w-36 shrink-0 truncate text-muted-foreground text-xs">
                {flashcard.subjectPath}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </>
  );
}
