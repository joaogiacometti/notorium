"use client";

import { useQuery } from "@tanstack/react-query";
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
import { SubjectSelect } from "@/components/shared/subject-select";
import { Button } from "@/components/ui/button";
import type {
  FlashcardProposalOutcome,
  ProposedFlashcard,
} from "@/features/assistant/tools";
import type { AssistantFlashcardProposalPart } from "@/features/assistant/types";
import { findProposedSubjectId } from "@/features/assistant/utils";
import { plainTextToRichText } from "@/lib/ai/plain-text-rich-text";
import { fetchSubjectOptions } from "@/lib/read-api/subjects";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface AssistantFlashcardProposalProps {
  proposal: AssistantFlashcardProposalPart;
  /** True while the chat streams; tool outputs wait for the reply to end. */
  disabled: boolean;
  controls: FlashcardProposalControls;
}

/**
 * Flashcards the assistant proposed in one tool call. Nothing is saved until
 * the user clicks Create on a card (or saves it from the Edit dialog);
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
  onDecide: (outcome: FlashcardProposalOutcome) => void;
  onRestore: () => void;
}

// A decided card collapses to its outcome while the others stay open.
function ProposedFlashcardSlot({
  card,
  status,
  disabled,
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
      disabled={disabled}
      onResolve={onDecide}
    />
  );
}

interface PendingFlashcardProposalProps {
  input: ProposedFlashcard;
  disabled: boolean;
  onResolve: (outcome: FlashcardProposalOutcome) => void;
}

function PendingFlashcardProposal({
  input,
  disabled,
  onResolve,
}: Readonly<PendingFlashcardProposalProps>) {
  const subject = useProposedSubject(input.subjectPath);
  const [isCreating, startCreating] = useTransition();
  const [editorOpen, setEditorOpen] = useState(false);
  const richCard = toRichFlashcard(input);

  function createProposedCard(subjectId: string) {
    startCreating(async () => {
      const result = await createFlashcard({ subjectId, ...richCard });
      if (!result.success) {
        toast.error(resolveActionErrorMessage(result));
        return;
      }

      toast.success("Flashcard created.");
      onResolve("created");
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-background p-3 text-sm">
      <FlashcardProposalPreview input={input} />
      <SubjectSelect
        value={subject.id}
        onChange={subject.choose}
        subjects={subject.options}
        label="Subject"
        placeholder={subject.loading ? "Loading subjects…" : undefined}
        error={subject.loadFailed ? "Could not load subjects." : undefined}
        disabled={isCreating}
      />
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
          onClick={() => subject.id && createProposedCard(subject.id)}
          disabled={disabled || isCreating || !subject.id}
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
          subjectId={subject.id ?? undefined}
          initialCard={richCard}
          // The assistant is only mounted when AI is configured.
          aiEnabled
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
      <span className="min-w-0 flex-1 truncate">{front}</span>
      {onRestore ? (
        <Button type="button" variant="ghost" size="xs" onClick={onRestore}>
          <Undo2 />
          Restore
        </Button>
      ) : null}
    </div>
  );
}

// Every proposal shares one cached subject list. Until the user picks, the
// selection follows the model's `subjectPath`, so it fills in once loaded.
function useProposedSubject(proposedPath: string | undefined) {
  const query = useQuery({
    queryKey: ["assistant-subject-options"],
    queryFn: () => fetchSubjectOptions(),
    staleTime: 1000 * 60 * 5,
  });
  const [chosenId, setChosenId] = useState<string | null | undefined>();
  const options = query.data ?? [];

  return {
    options,
    id:
      chosenId === undefined
        ? findProposedSubjectId(options, proposedPath)
        : chosenId,
    choose: setChosenId,
    loading: query.isPending,
    loadFailed: query.isError,
  };
}

function toRichFlashcard(input: ProposedFlashcard) {
  return {
    front: plainTextToRichText(input.front),
    back: plainTextToRichText(input.back),
  };
}
