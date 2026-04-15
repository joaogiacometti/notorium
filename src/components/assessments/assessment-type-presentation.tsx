"use client";

import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Ellipsis,
  GraduationCap,
  NotebookPen,
  Presentation,
  Rocket,
} from "lucide-react";
import type { AssessmentEntity } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

type AssessmentType = AssessmentEntity["type"];

interface AssessmentTypeStyle {
  icon: LucideIcon;
  text: string;
  bg: string;
  border: string;
  iconColor: string;
}

export const assessmentTypeStyles: Record<AssessmentType, AssessmentTypeStyle> =
  {
    exam: {
      icon: GraduationCap,
      text: "text-[color:var(--intent-exam-text)]",
      bg: "bg-[color:var(--intent-exam-bg)]",
      border: "border-[color:var(--intent-exam-border)]",
      iconColor: "text-[color:var(--intent-exam-fill)]",
    },
    assignment: {
      icon: ClipboardList,
      text: "text-[color:var(--intent-assignment-text)]",
      bg: "bg-[color:var(--intent-assignment-bg)]",
      border: "border-[color:var(--intent-assignment-border)]",
      iconColor: "text-[color:var(--intent-assignment-fill)]",
    },
    project: {
      icon: Rocket,
      text: "text-[color:var(--intent-project-text)]",
      bg: "bg-[color:var(--intent-project-bg)]",
      border: "border-[color:var(--intent-project-border)]",
      iconColor: "text-[color:var(--intent-project-fill)]",
    },
    presentation: {
      icon: Presentation,
      text: "text-[color:var(--intent-presentation-text)]",
      bg: "bg-[color:var(--intent-presentation-bg)]",
      border: "border-[color:var(--intent-presentation-border)]",
      iconColor: "text-[color:var(--intent-presentation-fill)]",
    },
    homework: {
      icon: NotebookPen,
      text: "text-[color:var(--intent-homework-text)]",
      bg: "bg-[color:var(--intent-homework-bg)]",
      border: "border-[color:var(--intent-homework-border)]",
      iconColor: "text-[color:var(--intent-homework-fill)]",
    },
    other: {
      icon: Ellipsis,
      text: "text-[color:var(--intent-other-text)]",
      bg: "bg-[color:var(--intent-other-bg)]",
      border: "border-[color:var(--intent-other-border)]",
      iconColor: "text-[color:var(--intent-other-fill)]",
    },
  };

const TYPE_LABELS: Record<AssessmentType, string> = {
  exam: "Exam",
  assignment: "Assignment",
  project: "Project",
  presentation: "Presentation",
  homework: "Homework",
  other: "Other",
};

interface AssessmentTypeBadgeProps {
  type: AssessmentType;
  className?: string;
}

export function AssessmentTypeBadge({
  type,
  className,
}: Readonly<AssessmentTypeBadgeProps>) {
  const typeStyle = assessmentTypeStyles[type];
  const TypeIcon = typeStyle.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        typeStyle.border,
        typeStyle.bg,
        typeStyle.text,
        className,
      )}
    >
      <TypeIcon className="size-3" />
      {TYPE_LABELS[type]}
    </span>
  );
}
