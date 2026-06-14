"use server";

import { headers } from "next/headers";
import { getServerEnv } from "@/env";
import { claimInitialAdminAccess } from "@/features/auth/mutations";
import {
  getApprovedUserByEmail,
  getUserAccessStatusByEmail,
} from "@/features/auth/queries";
import { getAuth } from "@/lib/auth/auth";
import { checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { LIMITS } from "@/lib/config/limits";
import { isEmailDeliveryEnabled } from "@/lib/email/config";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";
import { runValidatedAction } from "@/lib/server/action-runner";
import type {
  AuthRedirectResult,
  AuthRedirectSuccessResult,
  MutationResult,
} from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";
import {
  type LoginForm,
  loginSchema,
  type RequestPasswordResetForm,
  type ResetPasswordForm,
  requestPasswordResetSchema,
  resetPasswordSchema,
  type SignupForm,
  signupSchema,
} from "@/lib/validations/auth";

const passwordResetSuccess = { success: true } as const;

function createAuthRedirectResult(
  redirectTo: string,
): AuthRedirectSuccessResult {
  return {
    success: true,
    data: {
      redirectTo,
    },
  };
}

export const loginAction = async (
  data: LoginForm,
): Promise<AuthRedirectResult> => {
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
      } catch {
        return actionError("auth.loginFailed");
      }

      return createAuthRedirectResult("/subjects");
    },
  );
};

export const signUpAction = async (
  data: SignupForm,
): Promise<AuthRedirectResult> => {
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
      } catch {
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
        } catch {
          return actionError("auth.signupFailed");
        }

        return createAuthRedirectResult("/subjects");
      }

      return createAuthRedirectResult("/login?pendingApproval=1");
    },
  );
};

export const requestPasswordResetAction = async (
  data: RequestPasswordResetForm,
): Promise<MutationResult> => {
  return runValidatedAction(
    requestPasswordResetSchema,
    data,
    "auth.invalidInput",
    async (parsedData) => {
      if (!isEmailDeliveryEnabled()) {
        return actionError("auth.passwordResetUnavailable");
      }

      const approvedUser = await getApprovedUserByEmail(parsedData.email);
      if (!approvedUser) {
        return passwordResetSuccess;
      }

      const rateLimit = await consumeUserDailyRateLimit({
        prefix: LIMITS.passwordResetRateLimitPrefix,
        userId: approvedUser.id,
        limit: LIMITS.passwordResetRateLimitPerDay,
        errorCode: "auth.rateLimited",
      });

      if (rateLimit.limited) {
        return actionError(rateLimit.errorCode);
      }

      try {
        const appUrl = getServerEnv().BETTER_AUTH_URL.replace(/\/$/, "");
        await getAuth().api.requestPasswordReset({
          body: {
            email: approvedUser.email,
            redirectTo: `${appUrl}/reset-password`,
          },
        });
      } catch {
        return actionError("auth.passwordResetRequestFailed");
      }

      return passwordResetSuccess;
    },
  );
};

export const resetPasswordAction = async (
  data: ResetPasswordForm,
): Promise<MutationResult> => {
  return runValidatedAction(
    resetPasswordSchema,
    data,
    "auth.invalidInput",
    async (parsedData) => {
      try {
        await getAuth().api.resetPassword({
          body: {
            token: parsedData.token,
            newPassword: parsedData.password,
          },
        });
      } catch {
        return actionError("auth.passwordResetFailed");
      }

      return passwordResetSuccess;
    },
  );
};

export const logoutAction = async () => {
  await getAuth().api.signOut({
    headers: await headers(),
  });

  return { success: true } as const;
};
