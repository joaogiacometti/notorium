"use client";

import { useState } from "react";
import { toast } from "sonner";
import { applyFlashcardMerge } from "@/app/actions/flashcards-refine";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  RefineMergeCandidate,
  RefineMergeProposal,
} from "@/features/flashcards/refine/types";
import { getRichTextExcerpt } from "@/lib/editor/rich-text";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface MergePreviewDialogProps {
  primaryFlashcardId: string;
  primaryFront: string;
  proposal: RefineMergeProposal;
  sources: RefineMergeCandidate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged: () => void;
}

export function MergePreviewDialog({
  primaryFlashcardId,
  primaryFront,
  proposal,
  sources,
  open,
  onOpenChange,
  onMerged,
}: Readonly<MergePreviewDialogProps>) {
  const [isApplying, setIsApplying] = useState(false);

  const isMerge = proposal.action === "merge";

  async function handleAccept() {
    setIsApplying(true);

    try {
      const result = await applyFlashcardMerge({
        action: proposal.action,
        primaryFlashcardId,
        front: proposal.front,
        back: proposal.back,
        sourceFlashcardIds: proposal.sourceFlashcardIds,
      });

      if (!result.success) {
        toast.error(resolveActionErrorMessage(result));
        return;
      }

      toast.success(
        isMerge
          ? "Cards merged into one synthesis card."
          : "Relationship card created. Original cards were kept.",
      );
      onOpenChange(false);
      onMerged();
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isMerge ? "Merge duplicates" : "New relationship card"}
          </DialogTitle>
          <DialogDescription>{proposal.rationale}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border p-3 bg-(--intent-success-bg) border-(--intent-success-border)">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {isMerge ? "New merged card" : "New card"}
            </p>
            <TiptapRenderer
              content={proposal.front}
              className="prose prose-sm max-w-none font-medium"
            />
            <TiptapRenderer
              content={proposal.back}
              className="prose prose-sm max-w-none mt-2"
            />
          </div>
          {isMerge ? (
            <ProposalSourceList
              heading="These cards will be deleted (the merged card replaces them)"
              containerClassName="rounded-lg border p-3 bg-(--intent-danger-bg) border-(--intent-danger-border)"
              headingClassName="mb-1 text-xs font-medium text-(--intent-danger-text)"
              primaryFront={primaryFront}
              sources={sources}
            />
          ) : (
            <ProposalSourceList
              heading="Connects these cards (they are kept)"
              containerClassName="rounded-lg border p-3"
              headingClassName="mb-1 text-xs font-medium text-muted-foreground"
              primaryFront={primaryFront}
              sources={sources}
            />
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isApplying}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={isApplying} onClick={handleAccept}>
            <AsyncButtonContent
              pending={isApplying}
              idleLabel={isMerge ? "Accept merge" : "Create card"}
              pendingLabel={isMerge ? "Merging…" : "Creating…"}
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProposalSourceListProps {
  heading: string;
  containerClassName: string;
  headingClassName: string;
  primaryFront: string;
  sources: RefineMergeCandidate[];
}

function ProposalSourceList({
  heading,
  containerClassName,
  headingClassName,
  primaryFront,
  sources,
}: Readonly<ProposalSourceListProps>) {
  return (
    <div className={containerClassName}>
      <p className={headingClassName}>{heading}</p>
      <ul className="space-y-1 text-sm text-muted-foreground">
        <li className="truncate">{getRichTextExcerpt(primaryFront, 80)}</li>
        {sources.map((source) => (
          <li key={source.id} className="truncate">
            {getRichTextExcerpt(source.front, 80)}
          </li>
        ))}
      </ul>
    </div>
  );
}
