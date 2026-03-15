import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/index";
import {
  account,
  attendanceMiss,
  session,
  subject,
  user,
  verification,
} from "@/db/schema";
import { type E2EUserKind, getE2ECredentials } from "./env";

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      account,
      session,
      user,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
});

type AccessStatus = "approved" | "pending" | "blocked";

function getAccessStatus(kind: E2EUserKind): AccessStatus {
  if (kind === "pending") {
    return "pending";
  }

  if (kind === "blocked") {
    return "blocked";
  }

  return "approved";
}

export async function ensureE2EUser(kind: E2EUserKind = "approved") {
  const credentials = getE2ECredentials(kind);
  const accessStatus = getAccessStatus(kind);

  let [existingUser] = await db
    .select({
      id: user.id,
    })
    .from(user)
    .where(eq(user.email, credentials.email))
    .limit(1);

  if (!existingUser) {
    const result = await auth.api.signUpEmail({
      body: {
        email: credentials.email,
        name: credentials.name,
        password: credentials.password,
      },
    });

    existingUser = {
      id: result.user.id,
    };
  }

  await db
    .update(user)
    .set({
      accessStatus,
      name: credentials.name,
    })
    .where(eq(user.id, existingUser.id));

  return {
    ...credentials,
    userId: existingUser.id,
  };
}

export async function ensureApprovedE2EUser() {
  return ensureE2EUser("approved");
}

export async function clearUserSubjects(userId: string) {
  await db.delete(subject).where(eq(subject.userId, userId));
}

export async function clearUserSubjectsByNames(
  userId: string,
  names: string[],
) {
  if (names.length === 0) {
    return;
  }

  await db
    .delete(subject)
    .where(and(eq(subject.userId, userId), inArray(subject.name, names)));
}

export async function clearUserSessions(userId: string) {
  await db.delete(session).where(eq(session.userId, userId));
}

export async function clearUserAttendanceMissesBySubject(
  userId: string,
  subjectId: string,
) {
  await db
    .delete(attendanceMiss)
    .where(
      and(
        eq(attendanceMiss.userId, userId),
        eq(attendanceMiss.subjectId, subjectId),
      ),
    );
}

export async function createAttendanceMiss(
  userId: string,
  subjectId: string,
  missDate: string,
) {
  const [newAttendanceMiss] = await db
    .insert(attendanceMiss)
    .values({
      userId,
      subjectId,
      missDate,
    })
    .returning({ id: attendanceMiss.id });

  return newAttendanceMiss;
}

export async function updateSubjectAttendanceSettings(
  userId: string,
  subjectId: string,
  totalClasses: number,
  maxMisses: number,
) {
  await db
    .update(subject)
    .set({
      totalClasses,
      maxMisses,
    })
    .where(and(eq(subject.id, subjectId), eq(subject.userId, userId)));
}

export async function createSubject(
  userId: string,
  name: string,
  description: string,
) {
  const [newSubject] = await db
    .insert(subject)
    .values({
      userId,
      name,
      description,
    })
    .returning({ id: subject.id });

  return newSubject;
}
