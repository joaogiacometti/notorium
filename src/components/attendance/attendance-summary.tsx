"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AttendanceSettingsDialog } from "@/components/attendance/attendance-settings-dialog";
import { DeleteMissDialog } from "@/components/attendance/delete-miss-dialog";
import { RecordMissDialog } from "@/components/attendance/record-miss-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDateFnsLocale } from "@/lib/dates/date-locale";
import type { AttendanceMissEntity } from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface AttendanceSummaryProps {
  subjectId: string;
  totalClasses: number | null;
  maxMisses: number | null;
  misses: AttendanceMissEntity[];
}

function _pluralizeMiss(count: number) {
  return count === 1 ? "miss" : "misses";
}

function getStatusInfo(missCount: number, maxMisses: number) {
  const remaining = maxMisses - missCount;
  const ratio = missCount / maxMisses;

  if (missCount >= maxMisses) {
    const tone = getStatusToneClasses("danger");
    return {
      label: "Limit Reached",
      icon: XCircle,
      color: tone.text,
      bgColor: tone.bg,
      borderColor: tone.border,
      badgeVariant: "destructive" as const,
      progressColor: tone.fill,
      remaining: 0,
    };
  }

  if (ratio >= 0.75) {
    const tone = getStatusToneClasses("warning");
    return {
      label: "Warning",
      icon: AlertTriangle,
      color: tone.text,
      bgColor: tone.bg,
      borderColor: tone.border,
      badgeVariant: "secondary" as const,
      progressColor: tone.fill,
      remaining,
    };
  }

  const tone = getStatusToneClasses("success");
  return {
    label: "On Track",
    icon: CheckCircle2,
    color: tone.text,
    bgColor: tone.bg,
    borderColor: tone.border,
    badgeVariant: "secondary" as const,
    progressColor: tone.fill,
    remaining,
  };
}

export function AttendanceSummary({
  subjectId,
  totalClasses,
  maxMisses,
  misses,
}: Readonly<AttendanceSummaryProps>) {
  const locale = useLocale();
  const t = useTranslations("AttendanceSummary");
  const dateLocale = getDateFnsLocale(locale);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    date: string;
  } | null>(null);

  const isConfigured = totalClasses !== null && maxMisses !== null;
  const missCount = misses.length;

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isConfigured
              ? t("description_configured")
              : t("description_unconfigured")}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {isConfigured && (
            <Button
              size="sm"
              className="flex-1 gap-1.5 sm:flex-none"
              onClick={() => setRecordOpen(true)}
              id="btn-record-miss"
            >
              <Plus className="size-4" />
              <span>{t("record_miss")}</span>
            </Button>
          )}
          <AttendanceSettingsDialog
            subjectId={subjectId}
            totalClasses={totalClasses}
            maxMisses={maxMisses}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
          />
        </div>
      </div>

      {isConfigured ? (
        <div className="space-y-6">
          <AttendanceProgressCard
            missCount={missCount}
            maxMisses={maxMisses}
            totalClasses={totalClasses}
          />

          {misses.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="misses">
                <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:no-underline">
                  {t("recorded_misses")}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-3">
                    {misses.map((miss) => {
                      const formattedMissDate = format(
                        new Date(`${miss.missDate}T12:00:00`),
                        "MMMM d, yyyy",
                        { locale: dateLocale },
                      );

                      return (
                        <div
                          key={miss.id}
                          className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3 transition-colors hover:border-border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-md bg-muted/50">
                              <CalendarDays className="size-4 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium">
                              {formattedMissDate}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                id: miss.id,
                                date: formattedMissDate,
                              })
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5 sm:p-6">
          <div>
            <h3 className="text-base font-semibold">{t("empty_title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("empty_description")}
            </p>
          </div>
        </div>
      )}

      <RecordMissDialog
        subjectId={subjectId}
        open={recordOpen}
        onOpenChange={setRecordOpen}
      />

      {deleteTarget && (
        <DeleteMissDialog
          missId={deleteTarget.id}
          missDate={deleteTarget.date}
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

interface AttendanceProgressCardProps {
  missCount: number;
  maxMisses: number;
  totalClasses: number;
}

function AttendanceProgressCard({
  missCount,
  maxMisses,
  totalClasses,
}: Readonly<AttendanceProgressCardProps>) {
  const t = useTranslations("AttendanceSummary");
  const status = getStatusInfo(missCount, maxMisses);

  // Replace static label logic with translation keys mapping
  let statusLabel = "";
  if (missCount >= maxMisses) {
    statusLabel = t("status_limit");
  } else if (missCount / maxMisses >= 0.75) {
    statusLabel = t("status_warning");
  } else {
    statusLabel = t("status_track");
  }

  const StatusIcon = status.icon;
  const progressPercentage =
    maxMisses === 0 ? 100 : Math.min((missCount / maxMisses) * 100, 100);
  const attendanceRate =
    totalClasses > 0
      ? Math.round(((totalClasses - missCount) / totalClasses) * 100)
      : 100;

  return (
    <div
      className={`rounded-xl border ${status.borderColor} ${status.bgColor} p-5`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`size-5 ${status.color}`} />
          <span className={`text-sm font-semibold ${status.color}`}>
            {statusLabel}
          </span>
        </div>
        <Badge variant={status.badgeVariant} className="text-xs">
          {missCount >= maxMisses
            ? t("badge_no_misses")
            : t("badge_remaining", { count: status.remaining })}
        </Badge>
      </div>

      <div className="mb-2 flex items-end justify-between">
        <div className="text-3xl font-bold tracking-tight">
          {missCount}
          <span className="text-lg font-normal text-muted-foreground">
            {" / "}
            {maxMisses}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {t("attendance_rate")}
          </p>
          <p className="text-lg font-semibold">{attendanceRate}%</p>
        </div>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-background/60">
        <div
          className={`h-full rounded-full ${status.progressColor} transition-all duration-500 ease-out`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
