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
      text: "text-indigo-700 dark:text-indigo-300",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      iconColor: "text-indigo-500 dark:text-indigo-400",
    },
    assignment: {
      icon: ClipboardList,
      text: "text-sky-700 dark:text-sky-300",
      bg: "bg-sky-500/10",
      border: "border-sky-500/30",
      iconColor: "text-sky-500 dark:text-sky-400",
    },
    project: {
      icon: Rocket,
      text: "text-violet-700 dark:text-violet-300",
      bg: "bg-violet-500/10",
      border: "border-violet-500/30",
      iconColor: "text-violet-500 dark:text-violet-400",
    },
    presentation: {
      icon: Presentation,
      text: "text-fuchsia-700 dark:text-fuchsia-300",
      bg: "bg-fuchsia-500/10",
      border: "border-fuchsia-500/30",
      iconColor: "text-fuchsia-500 dark:text-fuchsia-400",
    },
    homework: {
      icon: NotebookPen,
      text: "text-teal-700 dark:text-teal-300",
      bg: "bg-teal-500/10",
      border: "border-teal-500/30",
      iconColor: "text-teal-500 dark:text-teal-400",
    },
    other: {
      icon: Ellipsis,
      text: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-500/10",
      border: "border-slate-500/30",
      iconColor: "text-slate-500 dark:text-slate-400",
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
