import { z } from "zod";
import { validationMessage } from "@/lib/validations/validation-messages";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, validationMessage("Validation.profile.nameMinLength"))
    .max(100, validationMessage("Validation.profile.nameMaxLength")),
});

export type UpdateProfileForm = z.infer<typeof updateProfileSchema>;
