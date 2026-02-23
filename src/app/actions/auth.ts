"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { LoginForm } from "@/components/login-form";
import type { SignupForm } from "@/components/signup-form";
import { auth } from "@/lib/auth";

type ActionResult = { success: true } | { success: false; error: string };

export const loginAction = async (data: LoginForm): Promise<ActionResult> => {
  try {
    await auth.api.signInEmail({
      body: {
        email: data.email,
        password: data.password,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Login failed" };
  }

  redirect("/");
};

export const signUpAction = async (data: SignupForm): Promise<ActionResult> => {
  try {
    await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Sign up failed" };
  }

  redirect("/");
};

export const logoutAction = async () => {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/login");
};
