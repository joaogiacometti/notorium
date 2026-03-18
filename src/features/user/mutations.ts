import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { user } from "@/db/schema";
import type { AppTheme } from "@/lib/theme";

export async function updateUserTheme(
  userId: string,
  theme: AppTheme,
): Promise<void> {
  await db
    .update(user)
    .set({ preferredTheme: theme })
    .where(eq(user.id, userId));
}
