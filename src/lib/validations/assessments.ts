import { z } from "zod";

const assessmentTypeValues = [
  "exam",
  "assignment",
  "project",
  "presentation",
  "homework",
  "other",
] as const;

const assessmentStatusValues = ["pending", "completed"] as const;

export const assessmentTypeSchema = z.enum(assessmentTypeValues);
export const assessmentStatusSchema = z.enum(assessmentStatusValues);

const optionalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be a valid date.")
  .optional();

const optionalNumberSchema = (label: string) =>
  z
    .number({ message: `${label} must be a number.` })
    .min(0, `${label} cannot be negative.`)
    .max(100, `${label} cannot exceed 100.`)
    .optional();

export const createAssessmentSchema = z.object({
  subjectId: z.string().min(1),
  title: z
    .string()
    .min(1, "Title is required.")
    .max(100, "Title must be at most 100 characters."),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters.")
    .optional(),
  type: assessmentTypeSchema.default("other"),
  status: assessmentStatusSchema.default("pending"),
  dueDate: optionalDateSchema,
  score: optionalNumberSchema("Score"),
  weight: optionalNumberSchema("Weight"),
});

export type CreateAssessmentForm = z.infer<typeof createAssessmentSchema>;

export const editAssessmentSchema = z.object({
  id: z.string().min(1),
  title: z
    .string()
    .min(1, "Title is required.")
    .max(100, "Title must be at most 100 characters."),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters.")
    .optional(),
  type: assessmentTypeSchema,
  status: assessmentStatusSchema,
  dueDate: optionalDateSchema,
  score: optionalNumberSchema("Score"),
  weight: optionalNumberSchema("Weight"),
});

export type EditAssessmentForm = z.infer<typeof editAssessmentSchema>;

export const deleteAssessmentSchema = z.object({
  id: z.string().min(1),
});

export type DeleteAssessmentForm = z.infer<typeof deleteAssessmentSchema>;
