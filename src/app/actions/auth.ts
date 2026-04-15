"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { claimInitialAdminAccess } from "@/features/auth/mutations";
import { getUserAccessStatusByEmail } from "@/features/auth/queries";
import { getAuth } from "@/lib/auth/auth";
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
type LoginActionResult = ActionErrorResult;

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

      try {
        await getAuth().api.signInEmail({
          body: {
            email: parsedData.email,
            password: parsedData.password,
          },
        });
      } catch (error) {
        if (error instanceof APIError) {
          return actionError("auth.loginFailed");
        }
        return actionError("auth.loginFailed");
      }

      redirect("/subjects");
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

      let createdUserId: string;
      try {
        const result = await getAuth().api.signUpEmail({
          body: {
            email: parsedData.email,
            password: parsedData.password,
            name: parsedData.name,
          },
        });
        createdUserId = result.user.id;
      } catch (error) {
        if (error instanceof APIError) {
          return actionError("auth.signupFailed");
        }
        return actionError("auth.signupFailed");
      }

      const isInitialAdmin = await claimInitialAdminAccess(createdUserId);

      if (isInitialAdmin) {
        try {
          await getAuth().api.signInEmail({
            body: {
              email: parsedData.email,
              password: parsedData.password,
            },
          });
        } catch (error) {
          if (error instanceof APIError) {
            return actionError("auth.signupFailed");
          }
          return actionError("auth.signupFailed");
        }

        redirect("/subjects");
      }

      redirect("/login?pendingApproval=1");
    },
  );
};

export const logoutAction = async () => {
  await getAuth().api.signOut({
    headers: await headers(),
  });

  return { success: true } as const;
};
