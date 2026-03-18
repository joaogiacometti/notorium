import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { user } from "@/db/schema";

export async function getUserPreferredTheme(userId: string): Promise<string> {
  const [result] = await db
    .select({ preferredTheme: user.preferredTheme })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result?.preferredTheme ?? "system";
}
