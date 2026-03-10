import { format, parseISO } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ClipboardList,
  Ellipsis,
  GraduationCap,
  NotebookPen,
  Pencil,
  Presentation,
  Rocket,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SubjectText } from "@/components/shared/subject-text";
import { Button } from "@/components/ui/button";
import { getDateFnsLocale } from "@/lib/dates/date-locale";
import type { AssessmentEntity } from "@/lib/server/api-contracts";
import { getScoreTone, getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

type AssessmentStatus = "overdue" | "completed" | "pending";
type AssessmentType = AssessmentEntity["type"];

function resolveAssessmentStatus(
  overdue: boolean,
  status: AssessmentEntity["status"],
): AssessmentStatus {
  if (overdue) return "overdue";
  if (status === "completed") return "completed";
  return "pending";
}

const STATUS_TONE = {
  overdue: getStatusToneClasses("danger"),
  completed: getStatusToneClasses("success"),
  pending: getStatusToneClasses("warning"),
} as const;

interface TypeStyle {
  icon: LucideIcon;
  text: string;
  bg: string;
  border: string;
  iconColor: string;
}

const TYPE_STYLES: Record<AssessmentType, TypeStyle> = {
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

interface AssessmentItemCardProps {
  item: AssessmentEntity;
  overdue: boolean;
  dueDetail?: string | null;
  showSubject?: boolean;
  showScore?: boolean;
  subjectName?: string;
  className?: string;
  onEdit: (assessment: AssessmentEntity) => void;
  onDelete: (assessment: AssessmentEntity) => void;
}

export function AssessmentItemCard({
  item,
  overdue,
  dueDetail,
  showSubject = false,
  showScore = true,
  subjectName,
  className,
  onEdit,
  onDelete,
}: Readonly<AssessmentItemCardProps>) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations("AssessmentItemCard");
  const assessmentStatus = resolveAssessmentStatus(overdue, item.status);
  const statusTone = STATUS_TONE[assessmentStatus];
  const statusLabel = t(`status_${assessmentStatus}`);
  const typeStyle = TYPE_STYLES[item.type];
  const TypeIcon = typeStyle.icon;
  const scoreTone =
    item.score === null
      ? null
      : getStatusToneClasses(getScoreTone(Number(item.score)));

  return (
    <div
      className={cn(
        "rounded-xl border-l-[3px] bg-card p-3 shadow-sm",
        statusTone.border,
        className,
      )}
    >
      {/* Header: icon + title + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg",
              typeStyle.bg,
            )}
          >
            <TypeIcon className={cn("size-4", typeStyle.iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="wrap-break-word hyphens-auto text-sm font-semibold leading-snug">
              {item.title}
            </p>
            {item.description && (
              <p className="mt-0.5 wrap-break-word hyphens-auto text-xs text-muted-foreground">
                {item.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(item)}
            aria-label={t("edit")}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(item)}
            aria-label={t("delete")}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Metadata pills */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {showSubject && (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
            <SubjectText
              value={subjectName ?? t("unknown_subject")}
              mode="truncate"
              className="inline-block max-w-[12rem] align-bottom"
            />
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
            statusTone.border,
            statusTone.bg,
            statusTone.text,
          )}
        >
          {statusLabel}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
            typeStyle.border,
            typeStyle.bg,
            typeStyle.text,
          )}
        >
          <TypeIcon className="size-3" />
          {t(`type_${item.type}`)}
        </span>
        {item.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs",
              overdue
                ? "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
                : "border-border/50 bg-muted/30 text-muted-foreground",
            )}
          >
            <CalendarDays className="size-3" />
            {format(parseISO(item.dueDate), "MMM d, yyyy", {
              locale: dateLocale,
            })}
            {dueDetail && <span className="opacity-75">· {dueDetail}</span>}
          </span>
        )}
        {showScore && scoreTone && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
              scoreTone.border,
              scoreTone.bg,
              scoreTone.text,
            )}
          >
            {Number(item.score).toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}
