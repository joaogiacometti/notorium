"use client";

import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import { Button } from "@/components/ui/button";

interface FlashcardBackDiffProps {
  previousBack: string;
  proposedBack: string;
  originalLabel: string;
  proposedLabel: string;
  acceptLabel: string;
  rejectLabel: string;
  onAccept: () => void;
  onReject: () => void;
}

export function FlashcardBackDiff({
  previousBack,
  proposedBack,
  originalLabel,
  proposedLabel,
  acceptLabel,
  rejectLabel,
  onAccept,
  onReject,
}: Readonly<FlashcardBackDiffProps>) {
  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-lg border p-3 bg-[var(--status-danger-bg)]">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {originalLabel}
        </p>
        <TiptapRenderer
          content={previousBack}
          className="tiptap-renderer-muted prose prose-sm max-w-none text-muted-foreground"
        />
      </div>
      <div className="rounded-lg border p-3 bg-[var(--status-success-bg)]">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {proposedLabel}
        </p>
        <TiptapRenderer
          content={proposedBack}
          className="prose prose-sm max-w-none"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onAccept}>
          {acceptLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onReject}>
          {rejectLabel}
        </Button>
      </div>
    </div>
  );
}
