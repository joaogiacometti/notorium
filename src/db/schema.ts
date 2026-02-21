import { relations } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
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
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("subject_userId_idx").on(table.userId)],
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

export const gradeCategory = pgTable(
  "grade_category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
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
    index("grade_category_subjectId_idx").on(table.subjectId),
    index("grade_category_userId_idx").on(table.userId),
  ],
);

export const grade = pgTable(
  "grade",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    value: numeric("value", { precision: 5, scale: 2 }).notNull(),
    categoryId: text("category_id")
      .notNull()
      .references((): AnyPgColumn => gradeCategory.id, {
        onDelete: "cascade",
      }),
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
    index("grade_categoryId_idx").on(table.categoryId),
    index("grade_userId_idx").on(table.userId),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  subjects: many(subject),
  notes: many(note),
  attendanceMisses: many(attendanceMiss),
  gradeCategories: many(gradeCategory),
  grades: many(grade),
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
  gradeCategories: many(gradeCategory),
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

export const noteRelations = relations(note, ({ one }) => ({
  subject: one(subject, {
    fields: [note.subjectId],
    references: [subject.id],
  }),
  user: one(user, {
    fields: [note.userId],
    references: [user.id],
  }),
}));

export const gradeCategoryRelations = relations(
  gradeCategory,
  ({ one, many }) => ({
    subject: one(subject, {
      fields: [gradeCategory.subjectId],
      references: [subject.id],
    }),
    user: one(user, {
      fields: [gradeCategory.userId],
      references: [user.id],
    }),
    grades: many(grade),
  }),
);

export const gradeRelations = relations(grade, ({ one }) => ({
  category: one(gradeCategory, {
    fields: [grade.categoryId],
    references: [gradeCategory.id],
  }),
  user: one(user, {
    fields: [grade.userId],
    references: [user.id],
  }),
}));
