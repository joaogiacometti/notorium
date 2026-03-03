"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import type { MutationResult } from "@/lib/api/contracts";
import { auth } from "@/lib/auth";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { actionError } from "@/lib/server-action-errors";
import {
  type LoginForm,
  loginSchema,
  type SignupForm,
  signupSchema,
} from "@/lib/validations/auth";

type ActionResult = MutationResult;

export const loginAction = async (data: LoginForm): Promise<ActionResult> => {
  const rateLimit = await checkAuthRateLimit();
  if (rateLimit.limited) {
    return actionError(rateLimit.errorCode);
  }

  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    return actionError("auth.invalidInput");
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return actionError("auth.loginFailed", { errorMessage: error.message });
    }
    return actionError("auth.loginFailed");
  }

  const locale = await getLocale();
  redirect(`/${locale}`);
};

export const signUpAction = async (data: SignupForm): Promise<ActionResult> => {
  const rateLimit = await checkAuthRateLimit();
  if (rateLimit.limited) {
    return actionError(rateLimit.errorCode);
  }

  const parsed = signupSchema.safeParse(data);
  if (!parsed.success) {
    return actionError("auth.invalidInput");
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return actionError("auth.signupFailed", { errorMessage: error.message });
    }
    return actionError("auth.signupFailed");
  }

  const locale = await getLocale();
  redirect(`/${locale}`);
};

export const logoutAction = async () => {
  await auth.api.signOut({
    headers: await headers(),
  });
  const locale = await getLocale();
  redirect(`/${locale}/login`);
};
