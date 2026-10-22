"use server";

import { cookies } from "next/headers";
import {
  TUTORING_MODE_COOKIE,
  type TutoringMode,
  tutoringModeSchema,
} from "@/features/assistant/validation";

const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year

/**
 * Persist the assistant's Hints first toggle in a cookie so the layout can
 * render the saved mode on the next request, like the sidebar state.
 *
 * @example
 * await setTutoringModePreference("answers");
 */
export async function setTutoringModePreference(
  mode: TutoringMode,
): Promise<void> {
  const parsedMode = tutoringModeSchema.parse(mode);
  const cookieStore = await cookies();
  cookieStore.set(TUTORING_MODE_COOKIE, parsedMode, {
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: true,
  });
}
