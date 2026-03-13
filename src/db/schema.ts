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

export const userAccessStatusEnum = pgEnum("user_access_status", [
  "pending",
  "approved",
  "blocked",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  accessStatus: userAccessStatusEnum("access_status")
    .notNull()
    .default("pending"),
  isAdmin: boolean("is_admin").notNull().default(false),
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
    index("subject_userId_archivedAt_updatedAt_idx").on(
      table.userId,
      table.archivedAt,
      table.updatedAt,
    ),
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
    index("attendance_miss_userId_missDate_idx").on(
      table.userId,
      table.missDate,
    ),
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
    index("note_userId_updatedAt_idx").on(table.userId, table.updatedAt),
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

export const flashcardStateEnum = pgEnum("flashcard_state", [
  "new",
  "learning",
  "review",
  "relearning",
]);

export const flashcardReviewRatingEnum = pgEnum("flashcard_review_rating", [
  "again",
  "hard",
  "good",
  "easy",
]);

export const aiProviderEnum = pgEnum("ai_provider", ["openrouter"]);

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
    index("assessment_userId_dueDate_idx").on(table.userId, table.dueDate),
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
    state: flashcardStateEnum("state").notNull().default("new"),
    dueAt: timestamp("due_at").defaultNow().notNull(),
    stability: numeric("stability", { precision: 10, scale: 4 }),
    difficulty: numeric("difficulty", { precision: 10, scale: 4 }),
    ease: integer("ease").notNull().default(250),
    intervalDays: integer("interval_days").notNull().default(0),
    learningStep: integer("learning_step"),
    lastReviewedAt: timestamp("last_reviewed_at"),
    reviewCount: integer("review_count").notNull().default(0),
    lapseCount: integer("lapse_count").notNull().default(0),
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
    index("flashcard_dueAt_idx").on(table.dueAt),
    index("flashcard_userId_dueAt_idx").on(table.userId, table.dueAt),
    index("flashcard_userId_updatedAt_idx").on(table.userId, table.updatedAt),
    index("flashcard_userId_subjectId_updatedAt_idx").on(
      table.userId,
      table.subjectId,
      table.updatedAt,
    ),
  ],
);

export const flashcardSchedulerSettings = pgTable(
  "flashcard_scheduler_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    desiredRetention: numeric("desired_retention", {
      precision: 4,
      scale: 3,
    })
      .notNull()
      .default("0.900"),
    weights: text("weights").notNull(),
    optimizedReviewCount: integer("optimized_review_count")
      .notNull()
      .default(0),
    lastOptimizedAt: timestamp("last_optimized_at"),
    legacySchedulerMigratedAt: timestamp("legacy_scheduler_migrated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("flashcard_scheduler_settings_userId_unique").on(table.userId),
    index("flashcard_scheduler_settings_userId_idx").on(table.userId),
  ],
);

export const userAiSettings = pgTable(
  "user_ai_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: aiProviderEnum("provider").notNull().default("openrouter"),
    model: text("model").notNull(),
    apiKeyCiphertext: text("api_key_ciphertext").notNull(),
    apiKeyIv: text("api_key_iv").notNull(),
    apiKeyTag: text("api_key_tag").notNull(),
    apiKeyLastFour: text("api_key_last_four").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("user_ai_settings_userId_unique").on(table.userId),
    index("user_ai_settings_userId_idx").on(table.userId),
  ],
);

export const flashcardReviewLog = pgTable(
  "flashcard_review_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    flashcardId: text("flashcard_id")
      .notNull()
      .references(() => flashcard.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: flashcardReviewRatingEnum("rating").notNull(),
    reviewedAt: timestamp("reviewed_at").notNull(),
    daysElapsed: integer("days_elapsed").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("flashcard_review_log_flashcardId_idx").on(table.flashcardId),
    index("flashcard_review_log_userId_idx").on(table.userId),
    index("flashcard_review_log_userId_reviewedAt_idx").on(
      table.userId,
      table.reviewedAt,
    ),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  subjects: many(subject),
  notes: many(note),
  attendanceMisses: many(attendanceMiss),
  assessments: many(assessment),
  flashcards: many(flashcard),
  flashcardReviewLogs: many(flashcardReviewLog),
  aiSettings: many(userAiSettings),
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

export const flashcardSchedulerSettingsRelations = relations(
  flashcardSchedulerSettings,
  ({ one }) => ({
    user: one(user, {
      fields: [flashcardSchedulerSettings.userId],
      references: [user.id],
    }),
  }),
);

export const flashcardReviewLogRelations = relations(
  flashcardReviewLog,
  ({ one }) => ({
    flashcard: one(flashcard, {
      fields: [flashcardReviewLog.flashcardId],
      references: [flashcard.id],
    }),
    user: one(user, {
      fields: [flashcardReviewLog.userId],
      references: [user.id],
    }),
  }),
);

export const userAiSettingsRelations = relations(userAiSettings, ({ one }) => ({
  user: one(user, {
    fields: [userAiSettings.userId],
    references: [user.id],
  }),
}));
