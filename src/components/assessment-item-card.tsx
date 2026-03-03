import { format, parseISO } from "date-fns";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AssessmentEntity } from "@/lib/api/contracts";
import { getDateFnsLocale } from "@/lib/date-locale";
import { getScoreTone, getStatusToneClasses } from "@/lib/status-tones";
import { cn } from "@/lib/utils";

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
  const statusTone = overdue
    ? getStatusToneClasses("danger")
    : item.status === "completed"
      ? getStatusToneClasses("success")
      : getStatusToneClasses("warning");
  const statusLabel = overdue
    ? t("status_overdue")
    : item.status === "completed"
      ? t("status_completed")
      : t("status_pending");
  const scoreTone =
    item.score === null
      ? null
      : getStatusToneClasses(getScoreTone(Number(item.score)));

  return (
    <div className={cn("rounded-xl border p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 wrap-break-word font-semibold">
          {item.title}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 sm:size-8"
            onClick={() => onEdit(item)}
            aria-label={t("edit")}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-destructive sm:size-8"
            onClick={() => onDelete(item)}
            aria-label={t("delete")}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {item.description && (
        <p className="mt-1 wrap-break-word text-sm text-muted-foreground">
          {item.description}
        </p>
      )}

      <div
        className={`mt-3 grid grid-cols-2 gap-2 ${
          showSubject ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        {showSubject && (
          <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
            <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              {t("subject")}
            </p>
            <p className="mt-0.5 text-sm font-medium">
              {subjectName ?? t("unknown_subject")}
            </p>
          </div>
        )}
        <div
          className={`rounded-lg border px-2.5 py-2 ${statusTone.border} ${statusTone.bg}`}
        >
          <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            {t("status")}
          </p>
          <p className={`mt-0.5 text-sm font-semibold ${statusTone.text}`}>
            {statusLabel}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
          <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            {t("type")}
          </p>
          <p className="mt-0.5 text-sm font-medium">{t(`type_${item.type}`)}</p>
        </div>
        {item.dueDate && (
          <div
            className={cn(
              "rounded-lg border px-2.5 py-2",
              overdue
                ? "border-red-500/30 bg-red-500/5"
                : "border-border/50 bg-muted/20",
            )}
          >
            <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              {t("due_date")}
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium">
              <CalendarDays className="size-3.5 text-muted-foreground" />
              {format(parseISO(item.dueDate), "MMM d, yyyy", {
                locale: dateLocale,
              })}
            </p>
            {dueDetail && (
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  overdue
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground",
                )}
              >
                {dueDetail}
              </p>
            )}
          </div>
        )}
        {showScore && scoreTone && (
          <div
            className={`rounded-lg border px-2.5 py-2 ${scoreTone.border} ${scoreTone.bg}`}
          >
            <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              {t("score")}
            </p>
            <p className={`mt-0.5 text-sm font-semibold ${scoreTone.text}`}>
              {Number(item.score).toFixed(1)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
