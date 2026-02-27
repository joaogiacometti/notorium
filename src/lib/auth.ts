import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/index";
import * as schema from "@/db/schema";

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

export async function getOptionalSession() {
  return getSession();
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function getAuthenticatedUserId(): Promise<string> {
  const session = await requireSession();
  return session.user.id;
}
