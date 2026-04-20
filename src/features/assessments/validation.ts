import { z } from "zod";
import {
  assessmentStatusValues,
  assessmentTypeValues,
  planningAssessmentSortValues,
  planningAssessmentStatusFilterValues,
  planningAssessmentTypeFilterValues,
} from "@/features/assessments/constants";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

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
    .max(
      field === "score"
        ? LIMITS.assessmentScoreMax
        : LIMITS.assessmentWeightMax,
      validationMessage(`Validation.assessments.${field}.maxValue`),
    )
    .nullable()
    .optional();

export const createAssessmentSchema = z.object({
  subjectId: z
    .string()
    .min(1, validationMessage("Validation.assessments.subjectRequired")),
  title: z
    .string()
    .min(1, validationMessage("Validation.assessments.titleRequired"))
    .max(
      LIMITS.assessmentTitleMax,
      validationMessage("Validation.assessments.titleMaxLength"),
    ),
  description: z
    .string()
    .max(
      LIMITS.assessmentDescriptionMax,
      validationMessage("Validation.assessments.descriptionMaxLength"),
    )
    .optional(),
  type: assessmentTypeSchema.default("other"),
  status: assessmentStatusSchema.default("pending"),
  dueDate: optionalDateSchema,
  score: optionalNumberSchema("score"),
  weight: optionalNumberSchema("weight"),
});

export type CreateAssessmentForm = z.infer<typeof createAssessmentSchema>;
export type CreateAssessmentFormInput = z.input<typeof createAssessmentSchema>;

export const editAssessmentSchema = z.object({
  id: z.string().min(1),
  title: z
    .string()
    .min(1, validationMessage("Validation.assessments.titleRequired"))
    .max(
      LIMITS.assessmentTitleMax,
      validationMessage("Validation.assessments.titleMaxLength"),
    ),
  description: z
    .string()
    .max(
      LIMITS.assessmentDescriptionMax,
      validationMessage("Validation.assessments.descriptionMaxLength"),
    )
    .optional(),
  type: assessmentTypeSchema,
  status: assessmentStatusSchema,
  dueDate: optionalDateSchema,
  score: optionalNumberSchema("score"),
  weight: optionalNumberSchema("weight"),
});

export type EditAssessmentForm = z.infer<typeof editAssessmentSchema>;
export type EditAssessmentFormInput = z.input<typeof editAssessmentSchema>;

export const deleteAssessmentSchema = z.object({
  id: z.string().min(1),
});

export type DeleteAssessmentForm = z.infer<typeof deleteAssessmentSchema>;

const bulkAssessmentIdsSchema = z
  .array(z.string().min(1))
  .min(1)
  .refine((ids) => new Set(ids).size === ids.length);

export const bulkDeleteAssessmentsSchema = z.object({
  ids: bulkAssessmentIdsSchema,
});

export type BulkDeleteAssessmentsForm = z.infer<
  typeof bulkDeleteAssessmentsSchema
>;

export const bulkUpdateAssessmentStatusSchema = z.object({
  ids: bulkAssessmentIdsSchema,
  status: assessmentStatusSchema,
});

export type BulkUpdateAssessmentStatusForm = z.infer<
  typeof bulkUpdateAssessmentStatusSchema
>;

const planningAssessmentDueDateFilterValues = [
  "all",
  "past",
  "today",
  "next7Days",
  "next30Days",
  "none",
] as const;

export const planningAssessmentsQuerySchema = z.object({
  pageIndex: z.number().int().min(0),
  pageSize: z.number().int().min(LIMITS.pageSizeMin).max(LIMITS.pageSizeMax),
  search: z.string().max(LIMITS.searchQueryMax).optional(),
  subjectId: z.string().min(1).optional(),
  statusFilter: z.enum(planningAssessmentStatusFilterValues),
  typeFilter: z.enum(planningAssessmentTypeFilterValues),
  sortBy: z.enum(planningAssessmentSortValues),
  dueDateFilter: z.enum(planningAssessmentDueDateFilterValues).optional(),
});

export type PlanningAssessmentsQueryInput = z.infer<
  typeof planningAssessmentsQuerySchema
>;
