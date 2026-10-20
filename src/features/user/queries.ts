import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { user } from "@/db/schema";
import { type AppTheme, isAppTheme } from "@/lib/theme";

export async function getUserPreferredTheme(userId: string): Promise<AppTheme> {
  const [result] = await getDb()
    .select({ preferredTheme: user.preferredTheme })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return isAppTheme(result?.preferredTheme) ? result.preferredTheme : "system";
}
