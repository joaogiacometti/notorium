import { z } from "zod";

export const attendanceSettingsSchema = z.object({
  subjectId: z.string().min(1),
  totalClasses: z
    .number()
    .int("Must be a whole number.")
    .min(1, "Must have at least 1 class.")
    .max(365, "Cannot exceed 365 classes."),
  maxMisses: z
    .number()
    .int("Must be a whole number.")
    .min(0, "Cannot be negative.")
    .max(365, "Cannot exceed 365 misses."),
});

export type AttendanceSettingsForm = z.infer<typeof attendanceSettingsSchema>;

export const recordMissSchema = z.object({
  subjectId: z.string().min(1),
  missDate: z.string().min(1, "Date is required."),
});

export type RecordMissForm = z.infer<typeof recordMissSchema>;

export const deleteMissSchema = z.object({
  id: z.string().min(1),
});

export type DeleteMissForm = z.infer<typeof deleteMissSchema>;
