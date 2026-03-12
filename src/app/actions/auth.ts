"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getUserAccessStatusByEmail } from "@/features/auth/queries";
import { auth } from "@/lib/auth/auth";
import { checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { runValidatedAction } from "@/lib/server/action-runner";
import type { MutationResult } from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";
import {
  type LoginForm,
  loginSchema,
  type SignupForm,
  signupSchema,
} from "@/lib/validations/auth";

type ActionResult = MutationResult;

export const loginAction = async (data: LoginForm): Promise<ActionResult> => {
  return runValidatedAction(
    loginSchema,
    data,
    "auth.invalidInput",
    async (parsedData) => {
      const rateLimit = await checkAuthRateLimit(parsedData.email);
      if (rateLimit.limited) {
        return actionError(rateLimit.errorCode);
      }

      const accessStatus = await getUserAccessStatusByEmail(parsedData.email);

      if (accessStatus === "pending") {
        return actionError("auth.accessPending");
      }

      if (accessStatus === "blocked") {
        return actionError("auth.accessBlocked");
      }

      try {
        await auth.api.signInEmail({
          body: {
            email: parsedData.email,
            password: parsedData.password,
          },
        });
      } catch (error) {
        if (error instanceof APIError) {
          return actionError("auth.loginFailed", {
            errorMessage: error.message,
          });
        }
        return actionError("auth.loginFailed");
      }

      const locale = await getLocale();
      redirect(`/${locale}`);
    },
  );
};

export const signUpAction = async (data: SignupForm): Promise<ActionResult> => {
  return runValidatedAction(
    signupSchema,
    data,
    "auth.invalidInput",
    async (parsedData) => {
      const rateLimit = await checkAuthRateLimit(parsedData.email);
      if (rateLimit.limited) {
        return actionError(rateLimit.errorCode);
      }

      try {
        await auth.api.signUpEmail({
          body: {
            email: parsedData.email,
            password: parsedData.password,
            name: parsedData.name,
          },
        });
      } catch (error) {
        if (error instanceof APIError) {
          return actionError("auth.signupFailed", {
            errorMessage: error.message,
          });
        }
        return actionError("auth.signupFailed");
      }

      const locale = await getLocale();
      redirect(`/${locale}/login`);
    },
  );
};

export const logoutAction = async () => {
  await auth.api.signOut({
    headers: await headers(),
  });
  const locale = await getLocale();
  redirect(`/${locale}/login`);
};
