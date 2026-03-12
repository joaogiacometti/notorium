import { format, parseISO } from "date-fns";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  AssessmentTypeBadge,
  assessmentTypeStyles,
} from "@/components/assessments/assessment-type-presentation";
import { SubjectText } from "@/components/shared/subject-text";
import { Button } from "@/components/ui/button";
import { getDateFnsLocale } from "@/lib/dates/date-locale";
import type { AssessmentEntity } from "@/lib/server/api-contracts";
import { getScoreTone, getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

type AssessmentStatus = "overdue" | "completed" | "pending";

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

interface AssessmentItemCardProps {
  item: AssessmentEntity;
  overdue: boolean;
  dueDetail?: string | null;
  showSubject?: boolean;
  showScore?: boolean;
  subjectName?: string;
  className?: string;
  actions?: ReactNode;
  onEdit?: (assessment: AssessmentEntity) => void;
  onDelete?: (assessment: AssessmentEntity) => void;
}

export function AssessmentItemCard({
  item,
  overdue,
  dueDetail,
  showSubject = false,
  showScore = true,
  subjectName,
  className,
  actions,
  onEdit,
  onDelete,
}: Readonly<AssessmentItemCardProps>) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations("AssessmentItemCard");
  const assessmentStatus = resolveAssessmentStatus(overdue, item.status);
  const statusTone = STATUS_TONE[assessmentStatus];
  const statusLabel = t(`status_${assessmentStatus}`);
  const typeStyle = assessmentTypeStyles[item.type];
  const TypeIcon = typeStyle.icon;
  const scoreTone =
    item.score === null
      ? null
      : getStatusToneClasses(getScoreTone(Number(item.score)));
  const resolvedActions =
    actions ??
    (onEdit && onDelete ? (
      <>
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
      </>
    ) : null);

  return (
    <div
      className={cn(
        "rounded-xl border-l-[3px] bg-card p-3 shadow-sm",
        statusTone.border,
        className,
      )}
    >
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
        {resolvedActions ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {resolvedActions}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {showSubject && (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
            <SubjectText
              value={subjectName ?? t("unknown_subject")}
              mode="truncate"
              className="inline-block max-w-48 align-bottom"
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
        <AssessmentTypeBadge type={item.type} />
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
