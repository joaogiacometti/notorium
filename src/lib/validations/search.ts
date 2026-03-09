import { z } from "zod";
import { validationMessage } from "@/lib/validations/validation-messages";

export const searchQuerySchema = z
  .string()
  .trim()
  .max(200, validationMessage("Validation.search.queryMaxLength"))
  .optional()
  .transform((value) => value ?? "");
