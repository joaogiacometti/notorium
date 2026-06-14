import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { user } from "@/db/schema";
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

export async function getApprovedUserByEmail(
  email: string,
): Promise<{ id: string; email: string } | null> {
  const [existingUser] = await getDb()
    .select({
      id: user.id,
      email: user.email,
      accessStatus: user.accessStatus,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!existingUser) {
    return null;
  }

  return existingUser.accessStatus === "approved"
    ? { id: existingUser.id, email: existingUser.email }
    : null;
}
