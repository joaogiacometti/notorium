"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { LoginForm } from "@/components/login-form";
import type { SignupForm } from "@/components/signup-form";
import { auth } from "@/lib/auth";

export const loginAction = async (data: LoginForm) => {
  await auth.api.signInEmail({
    body: {
      email: data.email,
      password: data.password,
    },
  });
  redirect("/");
};

export const signUpAction = async (data: SignupForm) => {
  await auth.api.signUpEmail({
    body: {
      email: data.email,
      password: data.password,
      name: data.name,
    },
  });
  redirect("/");
};

export const logoutAction = async () => {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/login");
};
