"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAllFlashcardIds,
  getFlashcardIdsForSubject,
  validateFlashcards,
} from "@/app/actions/flashcards";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { SubjectText } from "@/components/shared/subject-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LIMITS } from "@/lib/config/limits";
import type {
  FlashcardValidationIssue,
  FlashcardValidationItem,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { tErrors } from "@/lib/server/error-messages";

interface ValidateFlashcardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onValidationStarted: (
    issues: FlashcardValidationIssue[],
    flashcards: FlashcardValidationItem[],
  ) => void;
  subjects: SubjectEntity[];
  currentSubjectId?: string;
}

export function ValidateFlashcardsDialog({
  open,
  onOpenChange,
  onValidationStarted,
  subjects,
  currentSubjectId,
}: Readonly<ValidateFlashcardsDialogProps>) {
  const [isValidating, setIsValidating] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<
    string | "all" | undefined
  >(undefined);

  useEffect(() => {
    if (open) {
      setSelectedSubjectId(currentSubjectId ?? "all");
    }
  }, [open, currentSubjectId]);

  const handleValidate = async () => {
    if (!selectedSubjectId) {
      toast.error("No flashcards to validate.");
      return;
    }

    setIsValidating(true);

    try {
      let flashcardIds: string[];

      if (selectedSubjectId === "all") {
        const idsResult = await getAllFlashcardIds();

        if ("errorCode" in idsResult) {
          toast.error(tErrors(idsResult.errorCode, idsResult.errorParams));
          setIsValidating(false);
          return;
        }

        flashcardIds = idsResult.flashcardIds;
      } else {
        const idsResult = await getFlashcardIdsForSubject({
          subjectId: selectedSubjectId,
        });

        if ("errorCode" in idsResult) {
          toast.error(tErrors(idsResult.errorCode, idsResult.errorParams));
          setIsValidating(false);
          return;
        }

        flashcardIds = idsResult.flashcardIds;
      }

      if (flashcardIds.length === 0) {
        toast.error("No flashcards to validate.");
        setIsValidating(false);
        return;
      }

      if (flashcardIds.length > LIMITS.maxFlashcardsPerSubject) {
        toast.error("Too many flashcards. Maximum 500 cards per validation.");
        setIsValidating(false);
        return;
      }

      const result = await validateFlashcards({ flashcardIds });

      if ("errorCode" in result) {
        toast.error(tErrors(result.errorCode, result.errorParams));
        return;
      }

      onValidationStarted(result.issues, result.flashcards);
      onOpenChange(false);

      if (result.issues.length === 0) {
        toast.success("No issues found! All flashcards look good.");
      } else {
        const count = result.issues.length;
        toast.success(
          `${count} ${count === 1 ? "card" : "cards"} with issues found.`,
        );
      }
    } catch (_error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Validate Flashcards</DialogTitle>
          <DialogDescription>
            Use AI to check for incorrect information, confusing content, or
            duplicate cards.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="validation-subject">Subject</FieldLabel>
            <Select
              value={selectedSubjectId ?? "all"}
              onValueChange={(value) => setSelectedSubjectId(value || "all")}
              disabled={isValidating}
            >
              <SelectTrigger
                id="validation-subject"
                className="h-10 rounded-lg"
              >
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
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
          </Field>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isValidating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleValidate}
              disabled={isValidating}
            >
              <AsyncButtonContent
                pending={isValidating}
                idleLabel="Validate"
                pendingLabel="Validating..."
                idleIcon={<Sparkles className="size-4" />}
              />
            </Button>
          </DialogFooter>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  );
}
