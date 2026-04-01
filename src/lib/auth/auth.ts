import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/index";
import * as schema from "@/db/schema";
import { user } from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});

const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

const getSessionAccess = cache(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const [account] = await db
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
