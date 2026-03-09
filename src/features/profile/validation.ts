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

export const aiModelSchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.profile.aiModelRequired"))
  .max(150, validationMessage("Validation.profile.aiModelMaxLength"));

export const aiApiKeySchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.profile.aiApiKeyRequired"))
  .max(500, validationMessage("Validation.profile.aiApiKeyMaxLength"));

export const updateUserAiSettingsSchema = z.object({
  model: aiModelSchema,
  apiKey: z.string().trim().max(500).optional().default(""),
});

export const createUserAiSettingsSchema = z.object({
  model: aiModelSchema,
  apiKey: aiApiKeySchema,
});

export const clearUserAiSettingsSchema = z.object({});

export type UpdateUserAiSettingsForm = z.infer<
  typeof updateUserAiSettingsSchema
>;
export type UpdateUserAiSettingsFormInput = z.input<
  typeof updateUserAiSettingsSchema
>;
export type CreateUserAiSettingsForm = z.infer<
  typeof createUserAiSettingsSchema
>;
