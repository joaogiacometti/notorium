import { z } from "zod";
import { isSupportedLibraryBookMime } from "@/features/library/constants";
import { LIMITS } from "@/lib/config/limits";
import { bulkIdsSchema } from "@/lib/validations/schemas";
import { validationMessage } from "@/lib/validations/validation-messages";

const bookTitleSchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.library.titleRequired"))
  .max(
    LIMITS.libraryBookTitleMax,
    validationMessage("Validation.library.titleMaxLength"),
  );

const bookAuthorSchema = z
  .string()
  .trim()
  .max(
    LIMITS.libraryBookAuthorMax,
    validationMessage("Validation.library.authorMaxLength"),
  )
  .optional();

export const createBookSchema = z.object({
  title: bookTitleSchema,
  author: bookAuthorSchema,
  fileName: z.string().trim().min(1).max(255),
  mimeType: z
    .string()
    .trim()
    .min(1)
    .refine(
      isSupportedLibraryBookMime,
      validationMessage("Validation.library.fileRequired"),
    ),
  blobPathname: z.string().trim().min(1),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(
      LIMITS.libraryBookMaxBytes,
      validationMessage("Validation.library.fileTooLarge"),
    ),
});

export type CreateBookForm = z.infer<typeof createBookSchema>;

export const generateTokenSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z
    .string()
    .trim()
    .min(1)
    .refine(
      isSupportedLibraryBookMime,
      validationMessage("Validation.library.fileRequired"),
    ),
});

export type GenerateTokenForm = z.infer<typeof generateTokenSchema>;

export const updateReadingPageSchema = z.object({
  bookId: z.string().trim().min(1),
  page: z
    .number()
    .int(validationMessage("Validation.library.pageInvalid"))
    .min(1, validationMessage("Validation.library.pageInvalid")),
  totalPages: z.number().int().min(1).optional(),
});

export type UpdateReadingPageForm = z.infer<typeof updateReadingPageSchema>;

export const updateBookSchema = z.object({
  bookId: z.string().trim().min(1),
  title: bookTitleSchema,
  author: bookAuthorSchema,
});

export type UpdateBookForm = z.infer<typeof updateBookSchema>;

export const deleteBookSchema = z.object({
  bookId: z.string().trim().min(1),
});

export type DeleteBookForm = z.infer<typeof deleteBookSchema>;

export const bulkDeleteBooksSchema = z.object({
  ids: bulkIdsSchema,
});

export type BulkDeleteBooksForm = z.infer<typeof bulkDeleteBooksSchema>;
