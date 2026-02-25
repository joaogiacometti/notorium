"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { grade, gradeCategory } from "@/db/schema";
import type {
  GradeCategoryWithGrades,
  MutationResult,
} from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import {
  type CreateGradeCategoryForm,
  type CreateGradeForm,
  createGradeCategorySchema,
  createGradeSchema,
  type DeleteGradeCategoryForm,
  type DeleteGradeForm,
  deleteGradeCategorySchema,
  deleteGradeSchema,
  type EditGradeCategoryForm,
  type EditGradeForm,
  editGradeCategorySchema,
  editGradeSchema,
} from "@/lib/validations/grades";

export async function getGradeCategoriesBySubject(
  subjectId: string,
): Promise<GradeCategoryWithGrades[]> {
  const userId = await getAuthenticatedUserId();

  const categories = await db
    .select()
    .from(gradeCategory)
    .where(
      and(
        eq(gradeCategory.subjectId, subjectId),
        eq(gradeCategory.userId, userId),
      ),
    )
    .orderBy(asc(gradeCategory.createdAt));

  const grades = await db
    .select()
    .from(grade)
    .where(eq(grade.userId, userId))
    .orderBy(asc(grade.createdAt));

  return categories.map((category) => ({
    ...category,
    grades: grades.filter((g) => g.categoryId === category.id),
  }));
}

export async function createGradeCategory(
  data: CreateGradeCategoryForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = createGradeCategorySchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid category data." };
  }

  await db.insert(gradeCategory).values({
    name: parsed.data.name,
    weight: parsed.data.weight?.toString() ?? null,
    subjectId: parsed.data.subjectId,
    userId,
  });

  revalidatePath(`/subjects/${parsed.data.subjectId}`);
  return { success: true };
}

export async function editGradeCategory(
  data: EditGradeCategoryForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = editGradeCategorySchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid category data." };
  }

  const existing = await db
    .select()
    .from(gradeCategory)
    .where(
      and(
        eq(gradeCategory.id, parsed.data.id),
        eq(gradeCategory.userId, userId),
      ),
    );

  if (existing.length === 0) {
    return { error: "Category not found." };
  }

  await db
    .update(gradeCategory)
    .set({
      name: parsed.data.name,
      weight: parsed.data.weight?.toString() ?? null,
    })
    .where(
      and(
        eq(gradeCategory.id, parsed.data.id),
        eq(gradeCategory.userId, userId),
      ),
    );

  revalidatePath(`/subjects/${existing[0].subjectId}`);
  return { success: true };
}

export async function deleteGradeCategory(
  data: DeleteGradeCategoryForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = deleteGradeCategorySchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const existing = await db
    .select()
    .from(gradeCategory)
    .where(
      and(
        eq(gradeCategory.id, parsed.data.id),
        eq(gradeCategory.userId, userId),
      ),
    );

  if (existing.length === 0) {
    return { error: "Category not found." };
  }

  await db
    .delete(gradeCategory)
    .where(
      and(
        eq(gradeCategory.id, parsed.data.id),
        eq(gradeCategory.userId, userId),
      ),
    );

  revalidatePath(`/subjects/${existing[0].subjectId}`);
  return { success: true };
}

export async function createGrade(
  data: CreateGradeForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = createGradeSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid grade data." };
  }

  const existingCategory = await db
    .select()
    .from(gradeCategory)
    .where(
      and(
        eq(gradeCategory.id, parsed.data.categoryId),
        eq(gradeCategory.userId, userId),
      ),
    );

  if (existingCategory.length === 0) {
    return { error: "Category not found." };
  }

  await db.insert(grade).values({
    name: parsed.data.name,
    value: parsed.data.value.toString(),
    categoryId: parsed.data.categoryId,
    userId,
  });

  revalidatePath(`/subjects/${existingCategory[0].subjectId}`);
  return { success: true };
}

export async function editGrade(data: EditGradeForm): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = editGradeSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid grade data." };
  }

  const existing = await db
    .select()
    .from(grade)
    .where(and(eq(grade.id, parsed.data.id), eq(grade.userId, userId)));

  if (existing.length === 0) {
    return { error: "Grade not found." };
  }

  const existingCategory = await db
    .select()
    .from(gradeCategory)
    .where(eq(gradeCategory.id, existing[0].categoryId));

  await db
    .update(grade)
    .set({
      name: parsed.data.name,
      value: parsed.data.value.toString(),
    })
    .where(and(eq(grade.id, parsed.data.id), eq(grade.userId, userId)));

  if (existingCategory.length > 0) {
    revalidatePath(`/subjects/${existingCategory[0].subjectId}`);
  }
  return { success: true };
}

export async function deleteGrade(
  data: DeleteGradeForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = deleteGradeSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const existing = await db
    .select()
    .from(grade)
    .where(and(eq(grade.id, parsed.data.id), eq(grade.userId, userId)));

  if (existing.length === 0) {
    return { error: "Grade not found." };
  }

  const existingCategory = await db
    .select()
    .from(gradeCategory)
    .where(eq(gradeCategory.id, existing[0].categoryId));

  await db
    .delete(grade)
    .where(and(eq(grade.id, parsed.data.id), eq(grade.userId, userId)));

  if (existingCategory.length > 0) {
    revalidatePath(`/subjects/${existingCategory[0].subjectId}`);
  }
  return { success: true };
}
