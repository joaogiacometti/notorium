"use client";

import { useState } from "react";
import { StudyScheduleDialog } from "@/components/study-schedule/study-schedule-dialog";
import { Button } from "@/components/ui/button";
import { STUDY_WEEKDAY_LABELS } from "@/features/study-schedule/constants";
import { formatDateShort } from "@/lib/dates/format";

interface StudyScheduleSummaryProps {
  subjectId: string;
  weekday: number | null;
  termStart: string | null;
  termEnd: string | null;
}

export function StudyScheduleSummary({
  subjectId,
  weekday,
  termStart,
  termEnd,
}: Readonly<StudyScheduleSummaryProps>) {
  const [open, setOpen] = useState(false);
  const isConfigured = weekday !== null && termStart && termEnd;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Study schedule</h2>
        <Button
          variant="outline"
          size="sm"
          aria-label={isConfigured ? "Manage study schedule" : undefined}
          onClick={() => setOpen(true)}
        >
          {isConfigured ? "Manage" : "Set schedule"}
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {isConfigured
          ? `Classes on ${STUDY_WEEKDAY_LABELS[weekday]}s · ${formatDateShort(termStart)} – ${formatDateShort(termEnd)}`
          : "Set a weekly class day to get a study task for each week."}
      </p>
      <StudyScheduleDialog
        key={`${weekday}-${termStart}-${termEnd}`}
        subjectId={subjectId}
        weekday={weekday}
        termStart={termStart}
        termEnd={termEnd}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
