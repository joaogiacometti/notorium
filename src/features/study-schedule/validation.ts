import { z } from "zod";
import {
  buildStudyWeekOccurrences,
  isStudyTermWithinLimit,
} from "@/features/study-schedule/utils";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

const isoDateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    validationMessage("Validation.studySchedule.dateRequired"),
  );

export const studyScheduleSchema = z
  .object({
    subjectId: z.string().min(1),
    weekday: z
      .number()
      .int(validationMessage("Validation.studySchedule.weekday.invalid"))
      .min(0, validationMessage("Validation.studySchedule.weekday.invalid"))
      .max(6, validationMessage("Validation.studySchedule.weekday.invalid")),
    termStart: isoDateSchema,
    termEnd: isoDateSchema,
  })
  .superRefine((data, ctx) => {
    if (data.termEnd < data.termStart) {
      ctx.addIssue({
        code: "custom",
        path: ["termEnd"],
        message: validationMessage("Validation.studySchedule.endBeforeStart"),
      });
      return;
    }
    if (!isStudyTermWithinLimit(data.termStart, data.termEnd)) {
      ctx.addIssue(tooManyWeeksIssue());
      return;
    }
    const weeks = buildStudyWeekOccurrences(
      data.weekday,
      data.termStart,
      data.termEnd,
    ).length;
    if (weeks === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["termEnd"],
        message: validationMessage("Validation.studySchedule.noClassDay"),
      });
    }
    if (weeks > LIMITS.studyScheduleMaxWeeks) {
      ctx.addIssue(tooManyWeeksIssue());
    }
  });

function tooManyWeeksIssue() {
  return {
    code: "custom" as const,
    path: ["termEnd"],
    message: validationMessage("Validation.studySchedule.tooManyWeeks"),
  };
}

export type StudyScheduleForm = z.infer<typeof studyScheduleSchema>;

export const removeStudyScheduleSchema = z.object({
  subjectId: z.string().min(1),
});

export type RemoveStudyScheduleForm = z.infer<typeof removeStudyScheduleSchema>;
