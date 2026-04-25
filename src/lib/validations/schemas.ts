import { z } from "zod";

export const idSchema = z.string().min(1);

export const bulkIdsSchema = z
  .array(z.string().min(1))
  .min(1)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "IDs must be unique",
  });

export const optionalBulkIdsSchema = z
  .array(z.string().min(1))
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "IDs must be unique",
  })
  .optional();
