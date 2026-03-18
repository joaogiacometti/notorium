"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getUserAccessStatusByEmail } from "@/features/auth/queries";
import { getUserPreferredTheme } from "@/features/user/queries";
import { auth } from "@/lib/auth/auth";
import { checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { runValidatedAction } from "@/lib/server/action-runner";
import type { MutationResult } from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";
import {
  type LoginForm,
  loginSchema,
  type SignupForm,
  signupSchema,
} from "@/lib/validations/auth";

type ActionResult = MutationResult;
type LoginActionResult =
  | {
      success: true;
      data: { theme: string };
    }
  | ActionErrorResult;

export const loginAction = async (
  data: LoginForm,
): Promise<LoginActionResult> => {
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

      let userId: string;
      try {
        const result = await auth.api.signInEmail({
          body: {
            email: parsedData.email,
            password: parsedData.password,
          },
        });
        userId = result.user.id;
      } catch (error) {
        if (error instanceof APIError) {
          return actionError("auth.loginFailed");
        }
        return actionError("auth.loginFailed");
      }

      const theme = await getUserPreferredTheme(userId);

      return { success: true, data: { theme } };
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
          return actionError("auth.signupFailed");
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
