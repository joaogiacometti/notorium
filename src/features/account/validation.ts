import { z } from "zod";
import { validationMessage } from "@/lib/validations/validation-messages";

export const updateAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, validationMessage("Validation.account.nameMinLength"))
    .max(100, validationMessage("Validation.account.nameMaxLength")),
});

export type UpdateAccountForm = z.infer<typeof updateAccountSchema>;

export const aiModelSchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.account.aiModelRequired"))
  .max(150, validationMessage("Validation.account.aiModelMaxLength"));

export const aiApiKeySchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.account.aiApiKeyRequired"))
  .max(500, validationMessage("Validation.account.aiApiKeyMaxLength"));

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
