import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { instanceState, user } from "@/db/schema";

const INSTANCE_STATE_ID = "primary";
const INITIAL_ADMIN_LOCK_ID = 482_103_917;

export async function claimInitialAdminAccess(
  userId: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${INITIAL_ADMIN_LOCK_ID})`,
    );

    const [state] = await tx
      .select({
        initialAdminUserId: instanceState.initialAdminUserId,
      })
      .from(instanceState)
      .where(eq(instanceState.id, INSTANCE_STATE_ID))
      .limit(1);

    if (state) {
      return state.initialAdminUserId === userId;
    }

    const [existingAdmin] = await tx
      .select({
        id: user.id,
      })
      .from(user)
      .where(eq(user.isAdmin, true))
      .orderBy(asc(user.createdAt), asc(user.id))
      .limit(1);

    if (existingAdmin) {
      await tx.insert(instanceState).values({
        id: INSTANCE_STATE_ID,
        initialAdminUserId: existingAdmin.id,
        initialAdminAssignedAt: new Date(),
      });

      return existingAdmin.id === userId;
    }

    const [earliestUser] = await tx
      .select({
        id: user.id,
      })
      .from(user)
      .orderBy(asc(user.createdAt), asc(user.id))
      .limit(1);

    if (!earliestUser) {
      return false;
    }

    await tx
      .update(user)
      .set({
        accessStatus: "approved",
        isAdmin: true,
      })
      .where(eq(user.id, earliestUser.id));

    await tx.insert(instanceState).values({
      id: INSTANCE_STATE_ID,
      initialAdminUserId: earliestUser.id,
      initialAdminAssignedAt: new Date(),
    });

    return earliestUser.id === userId;
  });
}
