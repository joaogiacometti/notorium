import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { user } from "@/db/schema";
import { type AppTheme, isAppTheme } from "@/lib/theme";
import type { AccessStatus } from "@/lib/validations/access-control";

export async function getUserAccessStatusByEmail(
  email: string,
): Promise<AccessStatus | null> {
  const [existingUser] = await getDb()
    .select({
      accessStatus: user.accessStatus,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return existingUser?.accessStatus ?? null;
}

export async function getUserPreferredThemeByEmail(
  email: string,
): Promise<AppTheme> {
  const [existingUser] = await getDb()
    .select({
      preferredTheme: user.preferredTheme,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return isAppTheme(existingUser?.preferredTheme)
    ? existingUser.preferredTheme
    : "system";
}
