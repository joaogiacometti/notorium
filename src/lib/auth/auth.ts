import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db/index";
import * as schema from "@/db/schema";
import { user } from "@/db/schema";
import { getServerEnv } from "@/env";
import { sendEmail } from "@/lib/email/provider";
import { renderPasswordResetEmail } from "@/lib/email/templates/password-reset";

const resetPasswordTokenExpiresInSeconds = 60 * 60;

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      resetPasswordTokenExpiresIn: resetPasswordTokenExpiresInSeconds,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: authUser, url }) => {
        const env = getServerEnv();
        const appUrl = env.BETTER_AUTH_URL.replace(/\/$/, "");
        const baseUrl = new URL(appUrl);
        const resetUrl = new URL(url, baseUrl);
        resetUrl.protocol = baseUrl.protocol;
        resetUrl.host = baseUrl.host;

        const { subject, html } = renderPasswordResetEmail({
          userName: authUser.name,
          resetUrl: resetUrl.toString(),
        });

        const result = await sendEmail({
          to: authUser.email,
          subject,
          html,
        });

        if (!result.success) {
          console.error(
            `Failed to send password reset email to user ${authUser.id}:`,
            result.error,
          );
        }
      },
    },
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;
let cachedAuth: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  cachedAuth ??= createAuth();
  return cachedAuth;
}

const getSession = cache(async () => {
  const requestHeaders = await headers();
  return getAuth().api.getSession({
    headers: requestHeaders,
  });
});

const getSessionAccess = cache(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const [account] = await getDb()
    .select({
      accessStatus: user.accessStatus,
      isAdmin: user.isAdmin,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!account) {
    return null;
  }

  return {
    session,
    account,
  };
});

export async function getOptionalSession() {
  const state = await getSessionAccess();
  if (state?.account.accessStatus !== "approved") {
    return null;
  }

  return state.session;
}

export async function getOptionalSessionAccess() {
  const state = await getSessionAccess();
  if (state?.account.accessStatus !== "approved") {
    return null;
  }

  return state;
}

export async function requireSession() {
  const state = await getSessionAccess();

  if (state?.account.accessStatus !== "approved") {
    redirect("/login");
  }

  return state.session;
}

export async function getAuthenticatedUserId(): Promise<string> {
  const session = await requireSession();
  return session.user.id;
}

export async function requireAdminSession() {
  const state = await getSessionAccess();

  if (state?.account.accessStatus !== "approved") {
    redirect("/login");
  }

  if (!state.account.isAdmin) {
    redirect("/");
  }

  return state.session;
}
