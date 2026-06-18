"use server";

import { cookies } from "next/headers";

const SIDEBAR_COLLAPSED_COOKIE = "notorium:sidebar-collapsed";
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year

/**
 * Persist the desktop left-menu collapsed state in a cookie via Next.js so the
 * server can read it on the next request and render the correct initial state
 * without a visible transition.
 *
 * @example
 * await setSidebarCollapsed(true);
 */
export async function setSidebarCollapsed(collapsed: boolean): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SIDEBAR_COLLAPSED_COOKIE, String(collapsed), {
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: true,
  });
}
