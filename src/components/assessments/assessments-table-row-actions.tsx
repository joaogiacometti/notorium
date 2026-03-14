"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useState } from "react";
import { DeleteAssessmentDialog } from "@/components/assessments/delete-assessment-dialog";
import { EditAssessmentDialog } from "@/components/assessments/edit-assessment-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

interface AssessmentsTableRowActionsProps {
  assessment: AssessmentEntity;
  onUpdated?: (assessment: AssessmentEntity) => void;
  onDeleted?: (id: string) => void;
}

export function AssessmentsTableRowActions({
  assessment,
  onUpdated,
  onDeleted,
}: Readonly<AssessmentsTableRowActionsProps>) {
  const t = useTranslations("PlanningAssessmentsTable");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  function handleMenuClick(event: { stopPropagation: () => void }) {
    event.stopPropagation();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full border border-transparent bg-background/70 text-muted-foreground/75 shadow-xs transition-all hover:border-border/70 hover:bg-background hover:text-foreground"
            aria-label={t("open_actions")}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onKeyDown={handleKeyDown}
          >
            <MoreVertical className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(event) => {
              handleMenuClick(event);
              setEditOpen(true);
            }}
            className="cursor-pointer"
          >
            <Pencil className="size-4" />
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              handleMenuClick(event);
              setDeleteOpen(true);
            }}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditAssessmentDialog
        assessment={assessment}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={onUpdated}
      />
      <DeleteAssessmentDialog
        assessmentId={assessment.id}
        assessmentTitle={assessment.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
      />
    </>
  );
}
