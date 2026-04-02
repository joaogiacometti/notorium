import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { user } from "@/db/schema";

export async function getUserPreferredTheme(userId: string): Promise<string> {
  const [result] = await getDb()
    .select({ preferredTheme: user.preferredTheme })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result?.preferredTheme ?? "system";
}
