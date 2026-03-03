import { z } from "zod";
import { validationMessage } from "@/lib/validation-messages";

export const attendanceSettingsSchema = z.object({
  subjectId: z.string().min(1),
  totalClasses: z
    .number()
    .int(validationMessage("Validation.attendance.totalClasses.integer"))
    .min(1, validationMessage("Validation.attendance.totalClasses.min"))
    .max(365, validationMessage("Validation.attendance.totalClasses.max")),
  maxMisses: z
    .number()
    .int(validationMessage("Validation.attendance.maxMisses.integer"))
    .min(0, validationMessage("Validation.attendance.maxMisses.min"))
    .max(365, validationMessage("Validation.attendance.maxMisses.max")),
});

export type AttendanceSettingsForm = z.infer<typeof attendanceSettingsSchema>;

export const recordMissSchema = z.object({
  subjectId: z.string().min(1),
  missDate: z
    .string()
    .min(1, validationMessage("Validation.attendance.dateRequired")),
});

export type RecordMissForm = z.infer<typeof recordMissSchema>;

export const deleteMissSchema = z.object({
  id: z.string().min(1),
});

export type DeleteMissForm = z.infer<typeof deleteMissSchema>;
