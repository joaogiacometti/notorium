import { asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/index";
import { user } from "@/db/schema";
import type { AccessStatus } from "@/lib/validations/access-control";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  accessStatus: AccessStatus;
  createdAt: Date;
};

export async function isAdminUser(userId: string) {
  const [currentUser] = await getDb()
    .select({
      isAdmin: user.isAdmin,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return currentUser?.isAdmin ?? false;
}

export async function getManagedUsers(
  adminUserId: string,
): Promise<ManagedUser[]> {
  return getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      accessStatus: user.accessStatus,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(ne(user.id, adminUserId))
    .orderBy(asc(user.createdAt));
}
