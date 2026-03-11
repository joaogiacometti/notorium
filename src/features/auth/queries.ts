import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { user } from "@/db/schema";
import type { AccessStatus } from "@/lib/validations/access-control";

export async function getUserAccessStatusByEmail(
  email: string,
): Promise<AccessStatus | null> {
  const [existingUser] = await db
    .select({
      accessStatus: user.accessStatus,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return existingUser?.accessStatus ?? null;
}
