import { z } from "zod";
import { validationMessage } from "@/lib/validation-messages";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254, validationMessage("Validation.auth.emailMaxLength"))
    .pipe(
      z.email({ error: validationMessage("Validation.auth.emailInvalid") }),
    ),
  password: z
    .string()
    .min(8, validationMessage("Validation.auth.passwordMinLength"))
    .max(128, validationMessage("Validation.auth.passwordMaxLength")),
});

export type LoginForm = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, validationMessage("Validation.auth.nameMinLength"))
      .max(100, validationMessage("Validation.auth.nameMaxLength")),
    email: z
      .string()
      .trim()
      .max(254, validationMessage("Validation.auth.emailMaxLength"))
      .pipe(
        z.email({ error: validationMessage("Validation.auth.emailInvalid") }),
      ),
    password: z
      .string()
      .min(8, validationMessage("Validation.auth.passwordMinLength"))
      .max(128, validationMessage("Validation.auth.passwordMaxLength")),
    confirmPassword: z
      .string()
      .min(1, validationMessage("Validation.auth.confirmPasswordRequired")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: validationMessage("Validation.auth.passwordsDoNotMatch"),
    path: ["confirmPassword"],
  });

export type SignupForm = z.infer<typeof signupSchema>;
