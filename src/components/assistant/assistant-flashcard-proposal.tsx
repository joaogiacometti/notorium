"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CircleSlash, Pencil, Undo2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createFlashcard } from "@/app/actions/flashcards";
import { AssistantRichReply } from "@/components/assistant/assistant-rich-reply";
import type {
  FlashcardCardStatus,
  FlashcardProposalControls,
} from "@/components/assistant/use-flashcard-proposal-outcomes";
import { LazyCreateFlashcardDialog } from "@/components/flashcards/dialogs/lazy-create-flashcard-dialog";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { FolderSelect } from "@/components/shared/folder-select";
import { Button } from "@/components/ui/button";
import type {
  FlashcardProposalOutcome,
  ProposedFlashcard,
} from "@/features/assistant/tools";
import type { AssistantFlashcardProposalPart } from "@/features/assistant/types";
import {
  composeProposedFlashcardBack,
  findProposedFolderId,
  formatFlashcardExample,
} from "@/features/assistant/utils";
import type { FlashcardSource } from "@/features/flashcards/source-contract";
import { modelMarkdownToDocument } from "@/lib/ai/model-markdown";
import { invalidateFlashcardViews } from "@/lib/client-cache/invalidation";
import { folderOptionsQuery } from "@/lib/client-cache/queries";
import { documentText } from "@/lib/editor/document";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface AssistantFlashcardProposalProps {
  proposal: AssistantFlashcardProposalPart;
  /** True while the chat streams; tool outputs wait for the reply to end. */
  disabled: boolean;
  source?: FlashcardSource;
  controls: FlashcardProposalControls;
}

/**
 * Flashcards the assistant proposed in one tool call. Nothing is saved until
 * the user clicks Create on a card (or saves it from the create dialog its Edit opens);
 * Discard drops it. Cards left open when the user sends another message are
 * skipped and can be restored. `controls` records every outcome on the tool
 * call so the model sees it next turn.
 *
 * @example
 * <AssistantFlashcardProposal proposal={part} disabled={busy} controls={proposals} />
 */
export function AssistantFlashcardProposal({
  proposal,
  disabled,
  source,
  controls,
}: Readonly<AssistantFlashcardProposalProps>) {
  if (proposal.state === "input-streaming") {
    return (
      <p className="text-xs text-muted-foreground">Drafting flashcards…</p>
    );
  }

  if (proposal.state === "output-error") {
    return (
      <p className="text-xs text-muted-foreground">
        These flashcards could not be drafted. Ask again to retry.
      </p>
    );
  }

  if (
    proposal.state !== "input-available" &&
    proposal.state !== "output-available"
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      {proposal.input.cards.map((card, index) => (
        <ProposedFlashcardSlot
          // biome-ignore lint/suspicious/noArrayIndexKey: proposed cards never reorder.
          key={index}
          card={card}
          source={source}
          status={controls.statusOf(proposal, index)}
          disabled={disabled}
          onDecide={(outcome) => controls.decide(proposal, index, outcome)}
          onRestore={() => controls.restore(proposal, index)}
        />
      ))}
    </div>
  );
}

interface ProposedFlashcardSlotProps {
  card: ProposedFlashcard;
  status: FlashcardCardStatus;
  disabled: boolean;
  source?: FlashcardSource;
  onDecide: (outcome: FlashcardProposalOutcome) => void;
  onRestore: () => void;
}

// A decided card collapses to its outcome while the others stay open.
function ProposedFlashcardSlot({
  card,
  status,
  disabled,
  source,
  onDecide,
  onRestore,
}: Readonly<ProposedFlashcardSlotProps>) {
  if (status !== "open") {
    return (
      <ResolvedFlashcardProposal
        front={card.front}
        status={status}
        onRestore={status === "skipped" && !disabled ? onRestore : undefined}
      />
    );
  }

  return (
    <PendingFlashcardProposal
      input={card}
      source={source}
      disabled={disabled}
      onResolve={onDecide}
    />
  );
}

interface PendingFlashcardProposalProps {
  input: ProposedFlashcard;
  disabled: boolean;
  source?: FlashcardSource;
  onResolve: (outcome: FlashcardProposalOutcome) => void;
}

function PendingFlashcardProposal({
  input,
  disabled,
  source,
  onResolve,
}: Readonly<PendingFlashcardProposalProps>) {
  const queryClient = useQueryClient();
  const folder = useProposedFolder(input.folderPath);
  const [isCreating, startCreating] = useTransition();
  const [editorOpen, setEditorOpen] = useState(false);
  const richCard = { ...toRichFlashcard(input), ...(source ? { source } : {}) };

  function createProposedCard(folderId: string) {
    startCreating(async () => {
      const result = await createFlashcard({ folderId, ...richCard });
      if (!result.success) {
        toast.error(resolveActionErrorMessage(result));
        return;
      }

      toast.success("Flashcard created.");
      await invalidateFlashcardViews(queryClient);
      onResolve("created");
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3 text-sm">
      <FolderSelect
        value={folder.id}
        onChange={folder.choose}
        folders={folder.options}
        label="Folder"
        placeholder={folder.loading ? "Loading folders…" : undefined}
        error={folder.loadFailed ? "Could not load folders." : undefined}
        disabled={isCreating}
      />
      <FlashcardProposalPreview input={input} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onResolve("dismissed")}
          disabled={disabled || isCreating}
        >
          <X />
          Discard
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditorOpen(true)}
          disabled={disabled || isCreating}
        >
          <Pencil />
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => folder.id && createProposedCard(folder.id)}
          disabled={disabled || isCreating || !folder.id}
        >
          <AsyncButtonContent
            pending={isCreating}
            idleLabel="Create"
            pendingLabel="Creating…"
            idleIcon={<Check />}
          />
        </Button>
      </div>
      {editorOpen ? (
        <LazyCreateFlashcardDialog
          open
          onOpenChange={setEditorOpen}
          folderId={folder.id ?? undefined}
          initialCard={richCard}
          onCreated={() => {
            setEditorOpen(false);
            onResolve("created");
          }}
        />
      ) : null}
    </div>
  );
}

function FlashcardProposalPreview({
  input,
}: Readonly<{ input: ProposedFlashcard }>) {
  return (
    <dl className="space-y-2">
      <div>
        <dt className="text-xs font-medium text-muted-foreground">Front</dt>
        <dd>
          <AssistantRichReply text={input.front} />
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-muted-foreground">Back</dt>
        <dd>
          <AssistantRichReply text={input.back} />
        </dd>
      </div>
      {input.example ? (
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Example</dt>
          <dd>
            <AssistantRichReply text={formatFlashcardExample(input.example)} />
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

const OUTCOME_LABELS: Record<FlashcardProposalOutcome, string> = {
  created: "Flashcard created:",
  dismissed: "Discarded:",
  skipped: "Skipped:",
};

interface ResolvedFlashcardProposalProps {
  front: string;
  status: FlashcardProposalOutcome;
  /** Offered for skipped cards: reopens the card for a decision. */
  onRestore?: () => void;
}

function ResolvedFlashcardProposal({
  front,
  status,
  onRestore,
}: Readonly<ResolvedFlashcardProposalProps>) {
  const Icon = { created: Check, dismissed: X, skipped: CircleSlash }[status];

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5 shrink-0" />
      <span className="shrink-0">{OUTCOME_LABELS[status]}</span>
      <span className="min-w-0 flex-1 truncate">
        {documentText(modelMarkdownToDocument(front))}
      </span>
      {onRestore ? (
        <Button type="button" variant="ghost" size="xs" onClick={onRestore}>
          <Undo2 />
          Restore
        </Button>
      ) : null}
    </div>
  );
}

// Every proposal shares one cached folder list. Until the user picks, the
// selection follows the model's `folderPath`, so it fills in once loaded.
function useProposedFolder(proposedPath: string | undefined) {
  const query = useQuery(folderOptionsQuery());
  const [chosenId, setChosenId] = useState<string | null | undefined>();
  const options = query.data ?? [];

  return {
    options,
    id:
      chosenId === undefined
        ? findProposedFolderId(options, proposedPath)
        : chosenId,
    choose: setChosenId,
    loading: query.isPending,
    loadFailed: query.isError,
  };
}

function toRichFlashcard(input: ProposedFlashcard) {
  return {
    front: modelMarkdownToDocument(input.front),
    back: modelMarkdownToDocument(composeProposedFlashcardBack(input)),
  };
}
