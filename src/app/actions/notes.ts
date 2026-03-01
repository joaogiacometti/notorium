"use server";

import { del, put } from "@vercel/blob";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { note, noteImageAttachment, subject } from "@/db/schema";
import { appEnv } from "@/env";
import type {
  MutationResult,
  NoteEntity,
  NoteWithAttachmentsEntity,
} from "@/lib/api/contracts";
import { getAuthenticatedUser, getAuthenticatedUserId } from "@/lib/auth";
import {
  checkImageAllowed,
  checkImageStorageLimit,
  checkNoteLimit,
} from "@/lib/plan-enforcement";
import {
  type CreateNoteForm,
  createNoteSchema,
  type DeleteNoteForm,
  deleteNoteSchema,
  type EditNoteForm,
  editNoteSchema,
  noteAttachmentMaxFilesPerUpload,
  type RemoveNoteAttachmentForm,
  removeNoteAttachmentSchema,
  uploadNoteAttachmentsSchema,
  validateNoteAttachmentFile,
} from "@/lib/validations/notes";

function getBlobToken(): string | null {
  return appEnv.BLOB_READ_WRITE_TOKEN ?? null;
}

function getAttachmentPathname(userId: string, noteId: string, file: File) {
  const extensionFromFileName = file.name.split(".").at(-1)?.toLowerCase();
  const extension =
    extensionFromFileName &&
    /^[a-z0-9]+$/.test(extensionFromFileName) &&
    extensionFromFileName.length <= 10
      ? extensionFromFileName
      : "jpg";

  return `notes/${userId}/${noteId}/${crypto.randomUUID()}.${extension}`;
}

export async function getNotesBySubject(
  subjectId: string,
): Promise<NoteEntity[]> {
  const userId = await getAuthenticatedUserId();

  return db
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.subjectId, subjectId),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .orderBy(desc(note.updatedAt))
    .then((rows) => rows.map((row) => row.note));
}

export async function getNoteById(
  id: string,
): Promise<NoteWithAttachmentsEntity | null> {
  const userId = await getAuthenticatedUserId();

  const results = await db
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, id),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  const existingNote = results[0]?.note;

  if (!existingNote) {
    return null;
  }

  const attachments = await db
    .select()
    .from(noteImageAttachment)
    .where(
      and(
        eq(noteImageAttachment.noteId, existingNote.id),
        eq(noteImageAttachment.userId, userId),
      ),
    )
    .orderBy(desc(noteImageAttachment.createdAt));

  return {
    ...existingNote,
    attachments,
  };
}

export async function createNote(
  data: CreateNoteForm,
): Promise<MutationResult> {
  const { userId, plan } = await getAuthenticatedUser();
  const parsed = createNoteSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid note data." };
  }

  const existingSubject = await db
    .select({ id: subject.id })
    .from(subject)
    .where(
      and(
        eq(subject.id, parsed.data.subjectId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  if (existingSubject.length === 0) {
    return { error: "Subject not found." };
  }

  const limitCheck = await checkNoteLimit(userId, parsed.data.subjectId, plan);

  if (!limitCheck.allowed) {
    return {
      error: `Plan limit: you can have up to ${limitCheck.max} notes per subject.`,
    };
  }

  await db.insert(note).values({
    title: parsed.data.title,
    content: parsed.data.content ?? null,
    subjectId: parsed.data.subjectId,
    userId,
  });

  revalidatePath(`/subjects/${parsed.data.subjectId}`);
  return { success: true };
}

export async function editNote(data: EditNoteForm): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = editNoteSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid note data." };
  }

  const existing = await db
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, parsed.data.id),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  if (existing.length === 0) {
    return { error: "Note not found." };
  }

  await db
    .update(note)
    .set({
      title: parsed.data.title,
      content: parsed.data.content ?? null,
    })
    .where(and(eq(note.id, parsed.data.id), eq(note.userId, userId)));

  const existingNote = existing[0].note;
  revalidatePath(`/subjects/${existingNote.subjectId}`);
  revalidatePath(`/subjects/${existingNote.subjectId}/notes/${parsed.data.id}`);
  return { success: true };
}

function parseAttachmentUpload(formData: FormData): {
  noteId: string;
  files: File[];
  error?: string;
} {
  const noteId = formData.get("noteId");
  const parsed = uploadNoteAttachmentsSchema.safeParse({
    noteId: typeof noteId === "string" ? noteId : "",
  });

  if (!parsed.success) {
    return { noteId: "", files: [], error: "Invalid request." };
  }

  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    return {
      noteId: parsed.data.noteId,
      files: [],
      error: "Select at least one image.",
    };
  }

  if (files.length > noteAttachmentMaxFilesPerUpload) {
    return {
      noteId: parsed.data.noteId,
      files: [],
      error: `You can upload up to ${noteAttachmentMaxFilesPerUpload} images at a time.`,
    };
  }

  for (const file of files) {
    const validationError = validateNoteAttachmentFile(file);
    if (validationError) {
      return {
        noteId: parsed.data.noteId,
        files: [],
        error: `${file.name}: ${validationError}`,
      };
    }
  }

  return { noteId: parsed.data.noteId, files };
}

export async function uploadNoteAttachments(
  formData: FormData,
): Promise<MutationResult> {
  const { userId, plan } = await getAuthenticatedUser();

  if (!(await checkImageAllowed(plan))) {
    return { error: "Image attachments are not available on the Free plan." };
  }

  const blobToken = getBlobToken();

  if (!blobToken) {
    return { error: "Blob storage is not configured." };
  }

  const upload = parseAttachmentUpload(formData);

  if (upload.error) {
    return { error: upload.error };
  }

  const uploadSizeBytes = upload.files.reduce(
    (sum, file) => sum + file.size,
    0,
  );
  const storageCheck = await checkImageStorageLimit(
    userId,
    uploadSizeBytes,
    plan,
  );

  if (!storageCheck.allowed) {
    return {
      error:
        "You have reached your image storage limit. Remove some images to free up space.",
    };
  }

  const existing = await db
    .select({
      id: note.id,
      subjectId: note.subjectId,
    })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, upload.noteId),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  const existingNote = existing[0];

  if (!existingNote) {
    return { error: "Note not found." };
  }

  const uploadedBlobs: Array<{
    pathname: string;
    url: string;
    file: File;
  }> = [];

  try {
    for (const file of upload.files) {
      const blob = await put(
        getAttachmentPathname(userId, existingNote.id, file),
        file,
        {
          access: "private",
          addRandomSuffix: true,
          contentType: file.type,
          token: blobToken,
        },
      );

      uploadedBlobs.push({
        pathname: blob.pathname,
        url: blob.url,
        file,
      });
    }

    await db.insert(noteImageAttachment).values(
      uploadedBlobs.map(({ pathname, url, file }) => ({
        noteId: existingNote.id,
        userId,
        blobUrl: url,
        blobPathname: pathname,
        contentType: file.type,
        sizeBytes: file.size,
      })),
    );

    await db
      .update(note)
      .set({ updatedAt: new Date() })
      .where(and(eq(note.id, existingNote.id), eq(note.userId, userId)));
  } catch {
    if (uploadedBlobs.length > 0) {
      try {
        await del(
          uploadedBlobs.map((blob) => blob.pathname),
          { token: blobToken },
        );
      } catch {}
    }

    return { error: "Failed to upload note images." };
  }

  revalidatePath(`/subjects/${existingNote.subjectId}`);
  revalidatePath(
    `/subjects/${existingNote.subjectId}/notes/${existingNote.id}`,
  );
  return { success: true };
}

export async function removeNoteAttachment(
  data: RemoveNoteAttachmentForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = removeNoteAttachmentSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const existingAttachment = await db
    .select()
    .from(noteImageAttachment)
    .where(
      and(
        eq(noteImageAttachment.id, parsed.data.id),
        eq(noteImageAttachment.userId, userId),
      ),
    );

  const attachment = existingAttachment[0];

  if (!attachment) {
    return { error: "Attachment not found." };
  }

  const existingNotes = await db
    .select({
      id: note.id,
      subjectId: note.subjectId,
    })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, attachment.noteId),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  const existingNote = existingNotes[0];

  if (!existingNote) {
    return { error: "Note not found." };
  }

  await db
    .delete(noteImageAttachment)
    .where(
      and(
        eq(noteImageAttachment.id, attachment.id),
        eq(noteImageAttachment.userId, userId),
      ),
    );

  await db
    .update(note)
    .set({ updatedAt: new Date() })
    .where(and(eq(note.id, existingNote.id), eq(note.userId, userId)));

  const blobToken = getBlobToken();

  if (blobToken) {
    try {
      await del(attachment.blobPathname, { token: blobToken });
    } catch {}
  }

  revalidatePath(`/subjects/${existingNote.subjectId}`);
  revalidatePath(
    `/subjects/${existingNote.subjectId}/notes/${existingNote.id}`,
  );
  return { success: true };
}

export async function deleteNote(
  data: DeleteNoteForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = deleteNoteSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const existing = await db
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, parsed.data.id),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  if (existing.length === 0) {
    return { error: "Note not found." };
  }

  const existingNote = existing[0].note;

  const attachments = await db
    .select({
      blobPathname: noteImageAttachment.blobPathname,
    })
    .from(noteImageAttachment)
    .where(
      and(
        eq(noteImageAttachment.noteId, parsed.data.id),
        eq(noteImageAttachment.userId, userId),
      ),
    );

  await db
    .delete(note)
    .where(and(eq(note.id, parsed.data.id), eq(note.userId, userId)));

  const blobToken = getBlobToken();

  if (blobToken && attachments.length > 0) {
    try {
      await del(
        attachments.map((attachment) => attachment.blobPathname),
        { token: blobToken },
      );
    } catch {}
  }

  revalidatePath(`/subjects/${existingNote.subjectId}`);
  return { success: true };
}
