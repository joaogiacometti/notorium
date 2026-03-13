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
import { useTranslations } from "next-intl";
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
      text: "text-[color:var(--assessment-exam-text)]",
      bg: "bg-[color:var(--assessment-exam-bg)]",
      border: "border-[color:var(--assessment-exam-border)]",
      iconColor: "text-[color:var(--assessment-exam-icon)]",
    },
    assignment: {
      icon: ClipboardList,
      text: "text-[color:var(--assessment-assignment-text)]",
      bg: "bg-[color:var(--assessment-assignment-bg)]",
      border: "border-[color:var(--assessment-assignment-border)]",
      iconColor: "text-[color:var(--assessment-assignment-icon)]",
    },
    project: {
      icon: Rocket,
      text: "text-[color:var(--assessment-project-text)]",
      bg: "bg-[color:var(--assessment-project-bg)]",
      border: "border-[color:var(--assessment-project-border)]",
      iconColor: "text-[color:var(--assessment-project-icon)]",
    },
    presentation: {
      icon: Presentation,
      text: "text-[color:var(--assessment-presentation-text)]",
      bg: "bg-[color:var(--assessment-presentation-bg)]",
      border: "border-[color:var(--assessment-presentation-border)]",
      iconColor: "text-[color:var(--assessment-presentation-icon)]",
    },
    homework: {
      icon: NotebookPen,
      text: "text-[color:var(--assessment-homework-text)]",
      bg: "bg-[color:var(--assessment-homework-bg)]",
      border: "border-[color:var(--assessment-homework-border)]",
      iconColor: "text-[color:var(--assessment-homework-icon)]",
    },
    other: {
      icon: Ellipsis,
      text: "text-[color:var(--assessment-other-text)]",
      bg: "bg-[color:var(--assessment-other-bg)]",
      border: "border-[color:var(--assessment-other-border)]",
      iconColor: "text-[color:var(--assessment-other-icon)]",
    },
  };

interface AssessmentTypeBadgeProps {
  type: AssessmentType;
  className?: string;
}

export function AssessmentTypeBadge({
  type,
  className,
}: Readonly<AssessmentTypeBadgeProps>) {
  const t = useTranslations("AssessmentItemCard");
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
      {t(`type_${type}`)}
    </span>
  );
}
