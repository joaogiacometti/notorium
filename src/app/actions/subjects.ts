"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { subject } from "@/db/schema";
import { getAuthenticatedUserId } from "@/lib/auth";
import {
  type CreateSubjectForm,
  createSubjectSchema,
  type DeleteSubjectForm,
  deleteSubjectSchema,
  type EditSubjectForm,
  editSubjectSchema,
} from "@/lib/validations/subjects";

export async function getSubjects() {
  const userId = await getAuthenticatedUserId();

  return db
    .select()
    .from(subject)
    .where(eq(subject.userId, userId))
    .orderBy(desc(subject.updatedAt));
}

export async function getSubjectById(id: string) {
  const userId = await getAuthenticatedUserId();

  const results = await db
    .select()
    .from(subject)
    .where(and(eq(subject.id, id), eq(subject.userId, userId)));

  return results[0] ?? null;
}

export async function createSubject(data: CreateSubjectForm) {
  const userId = await getAuthenticatedUserId();
  const parsed = createSubjectSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid subject data." };
  }

  await db.insert(subject).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    userId,
  });

  revalidatePath("/subjects");
  return { success: true };
}

export async function editSubject(data: EditSubjectForm) {
  const userId = await getAuthenticatedUserId();
  const parsed = editSubjectSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid subject data." };
  }

  const existing = await db
    .select()
    .from(subject)
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  if (existing.length === 0) {
    return { error: "Subject not found." };
  }

  await db
    .update(subject)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  revalidatePath("/subjects");
  revalidatePath(`/subjects/${parsed.data.id}`);
  return { success: true };
}

export async function deleteSubject(data: DeleteSubjectForm) {
  const userId = await getAuthenticatedUserId();
  const parsed = deleteSubjectSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const existing = await db
    .select()
    .from(subject)
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  if (existing.length === 0) {
    return { error: "Subject not found." };
  }

  await db
    .delete(subject)
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  revalidatePath("/subjects");
  return { success: true };
}
