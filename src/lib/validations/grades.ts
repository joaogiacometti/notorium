import { z } from "zod";

export const createGradeCategorySchema = z.object({
  subjectId: z.string().min(1),
  name: z
    .string()
    .min(1, "Category name is required.")
    .max(100, "Category name must be at most 100 characters."),
  weight: z
    .number()
    .min(0, "Weight cannot be negative.")
    .max(100, "Weight cannot exceed 100.")
    .optional(),
});

export type CreateGradeCategoryForm = z.infer<typeof createGradeCategorySchema>;

export const editGradeCategorySchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(1, "Category name is required.")
    .max(100, "Category name must be at most 100 characters."),
  weight: z
    .number()
    .min(0, "Weight cannot be negative.")
    .max(100, "Weight cannot exceed 100.")
    .optional(),
});

export type EditGradeCategoryForm = z.infer<typeof editGradeCategorySchema>;

export const deleteGradeCategorySchema = z.object({
  id: z.string().min(1),
});

export type DeleteGradeCategoryForm = z.infer<typeof deleteGradeCategorySchema>;

export const createGradeSchema = z.object({
  categoryId: z.string().min(1),
  name: z
    .string()
    .min(1, "Grade name is required.")
    .max(100, "Grade name must be at most 100 characters."),
  value: z
    .number()
    .min(0, "Grade value cannot be negative.")
    .max(100, "Grade value cannot exceed 100."),
});

export type CreateGradeForm = z.infer<typeof createGradeSchema>;

export const editGradeSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(1, "Grade name is required.")
    .max(100, "Grade name must be at most 100 characters."),
  value: z
    .number()
    .min(0, "Grade value cannot be negative.")
    .max(100, "Grade value cannot exceed 100."),
});

export type EditGradeForm = z.infer<typeof editGradeSchema>;

export const deleteGradeSchema = z.object({
  id: z.string().min(1),
});

export type DeleteGradeForm = z.infer<typeof deleteGradeSchema>;
