import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

export const updateAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      LIMITS.authNameMin,
      validationMessage("Validation.account.nameMinLength"),
    )
    .max(
      LIMITS.accountNameMax,
      validationMessage("Validation.account.nameMaxLength"),
    ),
});

export type UpdateAccountForm = z.infer<typeof updateAccountSchema>;
