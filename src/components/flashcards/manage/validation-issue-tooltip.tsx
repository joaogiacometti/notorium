"use client";

import { Info, XIcon } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

interface ValidationIssueTooltipProps {
  explanation: string;
}

export function ValidationIssueTooltip({
  explanation,
}: Readonly<ValidationIssueTooltipProps>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="View issue details"
      >
        <Info className="size-4" />
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          showCloseButton={false}
          className="max-w-sm"
          onInteractOutside={() => setIsOpen(false)}
        >
          <DialogTitle className="sr-only">Issue Details</DialogTitle>
          <div className="flex flex-col gap-4">
            <DialogDescription className="text-base">
              {explanation}
            </DialogDescription>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <XIcon className="mr-2 size-4" />
              Close
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
