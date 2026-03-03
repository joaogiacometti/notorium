import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { db } from "@/db/index";
import * as schema from "@/db/schema";
import type { UserPlan } from "@/lib/plan-limits";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      plan: {
        type: "string",
        input: false,
        defaultValue: "free",
      },
    },
  },
  plugins: [nextCookies()],
});

const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function getOptionalSession() {
  return getSession();
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  return session;
}

export async function getAuthenticatedUserId(): Promise<string> {
  const session = await requireSession();
  return session.user.id;
}

export async function getAuthenticatedUser(): Promise<{
  userId: string;
  plan: UserPlan;
}> {
  const session = await requireSession();
  return {
    userId: session.user.id,
    plan: (session.user.plan as UserPlan) ?? "free",
  };
}
