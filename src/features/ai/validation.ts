import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

export const aiModelSchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.account.aiModelRequired"))
  .max(
    LIMITS.accountAiModelMax,
    validationMessage("Validation.account.aiModelMaxLength"),
  );

export const aiApiKeySchema = z
  .string()
  .trim()
  .min(1, validationMessage("Validation.account.aiApiKeyRequired"))
  .max(
    LIMITS.accountAiApiKeyMax,
    validationMessage("Validation.account.aiApiKeyMaxLength"),
  );

export const updateUserAiSettingsSchema = z.object({
  model: aiModelSchema,
  apiKey: z
    .string()
    .trim()
    .max(LIMITS.accountAiApiKeyMax)
    .optional()
    .default(""),
});

export const createUserAiSettingsSchema = z.object({
  model: aiModelSchema,
  apiKey: aiApiKeySchema,
});

export type UpdateUserAiSettingsForm = z.infer<
  typeof updateUserAiSettingsSchema
>;
export type UpdateUserAiSettingsFormInput = z.input<
  typeof updateUserAiSettingsSchema
>;
export type CreateUserAiSettingsForm = z.infer<
  typeof createUserAiSettingsSchema
>;
