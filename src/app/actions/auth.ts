"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  type LoginForm,
  loginSchema,
  type SignupForm,
  signupSchema,
} from "@/lib/validations/auth";

type ActionResult = { success: true } | { success: false; error: string };

export const loginAction = async (data: LoginForm): Promise<ActionResult> => {
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
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
  const parsed = signupSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
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
