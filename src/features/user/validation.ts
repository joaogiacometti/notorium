import { z } from "zod";
import { validThemes } from "@/lib/theme";
import { validationMessage } from "@/lib/validations/validation-messages";

export const updateUserThemeSchema = z.object({
  theme: z.enum(validThemes, {
    message: validationMessage("Validation.theme.invalid"),
  }),
});

export type UpdateUserThemeForm = z.infer<typeof updateUserThemeSchema>;
