import { z } from "zod";
import { validationMessage } from "@/lib/validations/validation-messages";

export const accessStatusSchema = z.enum(["pending", "approved", "blocked"], {
  error: validationMessage("ServerActions.common.invalidRequest"),
});

export const updateUserAccessSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(1, validationMessage("ServerActions.common.invalidRequest")),
  accessStatus: accessStatusSchema,
});

export type AccessStatus = z.infer<typeof accessStatusSchema>;
export type UpdateUserAccessInput = z.infer<typeof updateUserAccessSchema>;
