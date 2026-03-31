"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

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
  const t = useTranslations("ValidateFlashcardsDialog");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ServerActions");
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
      toast.error(t("error_no_cards"));
      return;
    }

    setIsValidating(true);

    try {
      let flashcardIds: string[];

      if (selectedSubjectId === "all") {
        const idsResult = await getAllFlashcardIds();

        if ("errorCode" in idsResult) {
          toast.error(resolveActionErrorMessage(idsResult, tErrors));
          setIsValidating(false);
          return;
        }

        flashcardIds = idsResult.flashcardIds;
      } else {
        const idsResult = await getFlashcardIdsForSubject({
          subjectId: selectedSubjectId,
        });

        if ("errorCode" in idsResult) {
          toast.error(resolveActionErrorMessage(idsResult, tErrors));
          setIsValidating(false);
          return;
        }

        flashcardIds = idsResult.flashcardIds;
      }

      if (flashcardIds.length === 0) {
        toast.error(t("error_no_cards"));
        setIsValidating(false);
        return;
      }

      if (flashcardIds.length > LIMITS.maxFlashcardsPerSubject) {
        toast.error(t("error_too_many_cards"));
        setIsValidating(false);
        return;
      }

      const result = await validateFlashcards({ flashcardIds });

      if ("errorCode" in result) {
        toast.error(resolveActionErrorMessage(result, tErrors));
        return;
      }

      onValidationStarted(result.issues, result.flashcards);
      onOpenChange(false);

      if (result.issues.length === 0) {
        toast.success(t("success_no_issues"));
      } else {
        toast.success(
          t("success_issues_found", { count: result.issues.length }),
        );
      }
    } catch (_error) {
      toast.error(tCommon("error_generic"));
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="validation-subject">
              {t("field_subject")}
            </FieldLabel>
            <Select
              value={selectedSubjectId ?? "all"}
              onValueChange={(value) => setSelectedSubjectId(value || "all")}
              disabled={isValidating}
            >
              <SelectTrigger
                id="validation-subject"
                className="h-10 rounded-lg"
              >
                <SelectValue placeholder={t("field_subject")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("option_all_subjects")}</SelectItem>
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
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleValidate}
              disabled={isValidating}
            >
              <AsyncButtonContent
                pending={isValidating}
                idleLabel={t("confirm")}
                pendingLabel={t("validating")}
                idleIcon={<Sparkles className="size-4" />}
              />
            </Button>
          </DialogFooter>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  );
}
