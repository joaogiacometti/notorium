import { relations } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const userPlanEnum = pgEnum("user_plan", ["free", "pro", "unlimited"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  plan: userPlanEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const subject = pgTable(
  "subject",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    totalClasses: integer("total_classes"),
    maxMisses: integer("max_misses"),
    notesEnabled: boolean("notes_enabled").default(true).notNull(),
    gradesEnabled: boolean("grades_enabled").default(true).notNull(),
    attendanceEnabled: boolean("attendance_enabled").default(true).notNull(),
    flashcardsEnabled: boolean("flashcards_enabled").default(true).notNull(),
    archivedAt: timestamp("archived_at"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("subject_userId_idx").on(table.userId),
    index("subject_userId_archivedAt_idx").on(table.userId, table.archivedAt),
  ],
);

export const attendanceMiss = pgTable(
  "attendance_miss",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    missDate: date("miss_date", { mode: "string" }).notNull(),
    subjectId: text("subject_id")
      .notNull()
      .references((): AnyPgColumn => subject.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("attendance_miss_subjectId_idx").on(table.subjectId),
    index("attendance_miss_userId_idx").on(table.userId),
    unique("attendance_miss_unique").on(
      table.subjectId,
      table.missDate,
      table.userId,
    ),
  ],
);

export const note = pgTable(
  "note",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    content: text("content"),
    subjectId: text("subject_id")
      .notNull()
      .references((): AnyPgColumn => subject.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("note_subjectId_idx").on(table.subjectId),
    index("note_userId_idx").on(table.userId),
  ],
);

export const noteImageAttachment = pgTable(
  "note_image_attachment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    noteId: text("note_id")
      .notNull()
      .references((): AnyPgColumn => note.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blobUrl: text("blob_url").notNull(),
    blobPathname: text("blob_pathname").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("note_image_attachment_noteId_idx").on(table.noteId),
    index("note_image_attachment_userId_idx").on(table.userId),
    unique("note_image_attachment_blobPathname_unique").on(table.blobPathname),
  ],
);

export const assessmentTypeEnum = pgEnum("assessment_type", [
  "exam",
  "assignment",
  "project",
  "presentation",
  "homework",
  "other",
]);

export const assessmentStatusEnum = pgEnum("assessment_status", [
  "pending",
  "completed",
]);

export const assessment = pgTable(
  "assessment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),
    type: assessmentTypeEnum("type").notNull().default("other"),
    status: assessmentStatusEnum("status").notNull().default("pending"),
    dueDate: date("due_date", { mode: "string" }),
    score: numeric("score", { precision: 5, scale: 2 }),
    weight: numeric("weight", { precision: 5, scale: 2 }),
    subjectId: text("subject_id")
      .notNull()
      .references((): AnyPgColumn => subject.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("assessment_subjectId_idx").on(table.subjectId),
    index("assessment_userId_idx").on(table.userId),
    index("assessment_status_idx").on(table.status),
    index("assessment_dueDate_idx").on(table.dueDate),
  ],
);

export const flashcard = pgTable(
  "flashcard",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    front: text("front").notNull(),
    back: text("back").notNull(),
    subjectId: text("subject_id")
      .notNull()
      .references((): AnyPgColumn => subject.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("flashcard_subjectId_idx").on(table.subjectId),
    index("flashcard_userId_idx").on(table.userId),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  subjects: many(subject),
  notes: many(note),
  noteImageAttachments: many(noteImageAttachment),
  attendanceMisses: many(attendanceMiss),
  assessments: many(assessment),
  flashcards: many(flashcard),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const subjectRelations = relations(subject, ({ one, many }) => ({
  user: one(user, {
    fields: [subject.userId],
    references: [user.id],
  }),
  notes: many(note),
  attendanceMisses: many(attendanceMiss),
  assessments: many(assessment),
  flashcards: many(flashcard),
}));

export const attendanceMissRelations = relations(attendanceMiss, ({ one }) => ({
  subject: one(subject, {
    fields: [attendanceMiss.subjectId],
    references: [subject.id],
  }),
  user: one(user, {
    fields: [attendanceMiss.userId],
    references: [user.id],
  }),
}));

export const noteRelations = relations(note, ({ one, many }) => ({
  subject: one(subject, {
    fields: [note.subjectId],
    references: [subject.id],
  }),
  user: one(user, {
    fields: [note.userId],
    references: [user.id],
  }),
  imageAttachments: many(noteImageAttachment),
}));

export const noteImageAttachmentRelations = relations(
  noteImageAttachment,
  ({ one }) => ({
    note: one(note, {
      fields: [noteImageAttachment.noteId],
      references: [note.id],
    }),
    user: one(user, {
      fields: [noteImageAttachment.userId],
      references: [user.id],
    }),
  }),
);

export const assessmentRelations = relations(assessment, ({ one }) => ({
  subject: one(subject, {
    fields: [assessment.subjectId],
    references: [subject.id],
  }),
  user: one(user, {
    fields: [assessment.userId],
    references: [user.id],
  }),
}));

export const flashcardRelations = relations(flashcard, ({ one }) => ({
  subject: one(subject, {
    fields: [flashcard.subjectId],
    references: [subject.id],
  }),
  user: one(user, {
    fields: [flashcard.userId],
    references: [user.id],
  }),
}));
