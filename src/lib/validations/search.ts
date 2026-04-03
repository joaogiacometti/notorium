import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

export const searchQuerySchema = z
  .string()
  .trim()
  .max(
    LIMITS.searchQueryMax,
    validationMessage("Validation.search.queryMaxLength"),
  )
  .optional()
  .transform((value) => value ?? "");
