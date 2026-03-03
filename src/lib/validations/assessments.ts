import { z } from "zod";
import { validationMessage } from "@/lib/validation-messages";

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
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    validationMessage("Validation.assessments.dueDateInvalid"),
  )
  .optional();

const optionalNumberSchema = (field: "score" | "weight") =>
  z
    .number({
      message: validationMessage(`Validation.assessments.${field}.notNumber`),
    })
    .min(0, validationMessage(`Validation.assessments.${field}.minValue`))
    .max(100, validationMessage(`Validation.assessments.${field}.maxValue`))
    .optional();

export const createAssessmentSchema = z.object({
  subjectId: z.string().min(1),
  title: z
    .string()
    .min(1, validationMessage("Validation.assessments.titleRequired"))
    .max(100, validationMessage("Validation.assessments.titleMaxLength")),
  description: z
    .string()
    .max(1000, validationMessage("Validation.assessments.descriptionMaxLength"))
    .optional(),
  type: assessmentTypeSchema.default("other"),
  status: assessmentStatusSchema.default("pending"),
  dueDate: optionalDateSchema,
  score: optionalNumberSchema("score"),
  weight: optionalNumberSchema("weight"),
});

export type CreateAssessmentForm = z.infer<typeof createAssessmentSchema>;

export const editAssessmentSchema = z.object({
  id: z.string().min(1),
  title: z
    .string()
    .min(1, validationMessage("Validation.assessments.titleRequired"))
    .max(100, validationMessage("Validation.assessments.titleMaxLength")),
  description: z
    .string()
    .max(1000, validationMessage("Validation.assessments.descriptionMaxLength"))
    .optional(),
  type: assessmentTypeSchema,
  status: assessmentStatusSchema,
  dueDate: optionalDateSchema,
  score: optionalNumberSchema("score"),
  weight: optionalNumberSchema("weight"),
});

export type EditAssessmentForm = z.infer<typeof editAssessmentSchema>;

export const deleteAssessmentSchema = z.object({
  id: z.string().min(1),
});

export type DeleteAssessmentForm = z.infer<typeof deleteAssessmentSchema>;
