import { relations, sql } from "drizzle-orm";
import type { AnyPgColumn, IndexBuilder } from "drizzle-orm/pg-core";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  flashcardReviewRatingEnum,
  flashcardStateEnum,
  userAccessStatusEnum,
} from "@/db/schema-enums";
import type { FlashcardReviewSchedulingSnapshot } from "@/features/flashcard-review/types";
import type { RichTextDocument } from "@/lib/editor/document";

export * from "@/db/schema-enums";

// Accent- and case-insensitive search index. `immutable_unaccent` comes from
// drizzle/0070_unaccent_search.sql; queries must wrap the column the same way
// (`foldedContains` in src/features/search/match-sql.ts) or the planner skips it.
function unaccentTrigramIndex(name: string, column: AnyPgColumn): IndexBuilder {
  return index(name).using(
    "gin",
    sql`immutable_unaccent(${column}) gin_trgm_ops`,
  );
}

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
  preferredTheme: text("preferred_theme").default("system").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const instanceState = pgTable("instance_state", {
  id: text("id").primaryKey(),
  initialAdminUserId: text("initial_admin_user_id").notNull(),
  initialAdminAssignedAt: timestamp("initial_admin_assigned_at").notNull(),
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
    issuer: text("issuer").notNull().default("local:credential"),
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
  (table) => [
    index("account_userId_idx").on(table.userId),
    uniqueIndex("account_issuer_accountId_unique").on(
      table.issuer,
      table.accountId,
    ),
  ],
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

export const folder = pgTable(
  "folder",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    parentFolderId: text("parent_folder_id").references(
      (): AnyPgColumn => folder.id,
      { onDelete: "cascade" },
    ),
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
    uniqueIndex("folder_userId_parentFolderId_name_unique").on(
      table.userId,
      sql`coalesce(${table.parentFolderId}, '__root_folder__')`,
      table.name,
    ),
    index("folder_parentFolderId_idx").on(table.parentFolderId),
    index("folder_userId_idx").on(table.userId),
    unaccentTrigramIndex("folder_name_unaccent_trgm_idx", table.name),
  ],
);

export const note = pgTable(
  "note",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    content: jsonb("content_document").$type<RichTextDocument>().notNull(),
    contentText: text("content_text").notNull().default(""),
    folderId: text("folder_id")
      .notNull()
      .references((): AnyPgColumn => folder.id, { onDelete: "cascade" }),
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
    index("note_folderId_idx").on(table.folderId),
    index("note_userId_idx").on(table.userId),
    index("note_userId_updatedAt_idx").on(table.userId, table.updatedAt),
    unaccentTrigramIndex("note_title_unaccent_trgm_idx", table.title),
    unaccentTrigramIndex("note_content_unaccent_trgm_idx", table.contentText),
  ],
);

// An uploaded PDF document. The file lives in media storage at `blobPathname`;
// `lastPage` is the reading position. Saving it leaves `updatedAt` untouched
// so reading never reorders document lists.
export const pdfDocument = pgTable(
  "pdf_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    blobPathname: text("blob_pathname").notNull().unique(),
    sizeBytes: integer("size_bytes").notNull(),
    pageCount: integer("page_count"),
    lastPage: integer("last_page").notNull().default(1),
    folderId: text("folder_id")
      .notNull()
      .references((): AnyPgColumn => folder.id, { onDelete: "cascade" }),
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
    index("pdf_document_folderId_idx").on(table.folderId),
    index("pdf_document_userId_idx").on(table.userId),
    index("pdf_document_userId_updatedAt_idx").on(
      table.userId,
      table.updatedAt,
    ),
  ],
);

export const flashcard = pgTable(
  "flashcard",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    front: jsonb("front_document").$type<RichTextDocument>().notNull(),
    frontText: text("front_text").notNull().default(""),
    backText: text("back_text").notNull().default(""),
    frontNormalized: text("front_normalized").notNull(),
    sourceNoteId: text("source_note_id").references(() => note.id, {
      onDelete: "set null",
    }),
    back: jsonb("back_document").$type<RichTextDocument>().notNull(),
    state: flashcardStateEnum("state").notNull().default("new"),
    dueAt: timestamp("due_at").defaultNow().notNull(),
    stability: numeric("stability", { precision: 10, scale: 4 }),
    difficulty: numeric("difficulty", { precision: 10, scale: 4 }),
    intervalDays: integer("interval_days").notNull().default(0),
    learningStep: integer("learning_step"),
    lastReviewedAt: timestamp("last_reviewed_at"),
    reviewCount: integer("review_count").notNull().default(0),
    lapseCount: integer("lapse_count").notNull().default(0),
    // Set when the user defers the card to the end of review sessions; null
    // means unmarked. Cleared only by the user.
    studyLaterAt: timestamp("study_later_at"),
    folderId: text("folder_id")
      .notNull()
      .references((): AnyPgColumn => folder.id, { onDelete: "cascade" }),
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
    unique("flashcard_userId_frontNormalized_unique").on(
      table.userId,
      table.frontNormalized,
    ),
    index("flashcard_folderId_idx").on(table.folderId),
    index("flashcard_userId_idx").on(table.userId),
    index("flashcard_dueAt_idx").on(table.dueAt),
    index("flashcard_userId_dueAt_idx").on(table.userId, table.dueAt),
    // ON DELETE SET NULL looks up cards by source; unindexed it scans flashcard.
    index("flashcard_sourceNoteId_idx").on(table.sourceNoteId),
    index("flashcard_userId_updatedAt_idx").on(table.userId, table.updatedAt),
    index("flashcard_userId_folderId_updatedAt_idx").on(
      table.userId,
      table.folderId,
      table.updatedAt,
    ),
    unaccentTrigramIndex("flashcard_front_unaccent_trgm_idx", table.frontText),
    unaccentTrigramIndex("flashcard_back_unaccent_trgm_idx", table.backText),
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
    automaticOptimizationEnabled: boolean("automatic_optimization_enabled")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("flashcard_scheduler_settings_userId_unique").on(table.userId),
  ],
);

export const flashcardReviewLog = pgTable(
  "flashcard_review_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Historical identifier, intentionally not a foreign key: deleting a card
    // must not erase review activity or optimization input.
    flashcardId: text("flashcard_id").notNull(),
    folderId: text("folder_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientReviewId: text("client_review_id"),
    reviewCountAfter: integer("review_count_after"),
    previousSchedulingState: jsonb(
      "previous_scheduling_state",
    ).$type<FlashcardReviewSchedulingSnapshot>(),
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
    index("flashcard_review_log_folderId_idx").on(table.folderId),
    index("flashcard_review_log_userId_reviewedAt_idx").on(
      table.userId,
      table.reviewedAt,
    ),
    index("flashcard_review_log_userId_flashcardId_reviewedAt_idx").on(
      table.userId,
      table.flashcardId,
      table.reviewedAt,
    ),
    uniqueIndex("flashcard_review_log_userId_clientReviewId_unique")
      .on(table.userId, table.clientReviewId)
      .where(sql`${table.clientReviewId} is not null`),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  folders: many(folder),
  notes: many(note),
  pdfDocuments: many(pdfDocument),
  flashcards: many(flashcard),
  flashcardReviewLogs: many(flashcardReviewLog),
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

export const folderRelations = relations(folder, ({ one, many }) => ({
  parentFolder: one(folder, {
    fields: [folder.parentFolderId],
    references: [folder.id],
    relationName: "folderHierarchy",
  }),
  childFolders: many(folder, { relationName: "folderHierarchy" }),
  user: one(user, {
    fields: [folder.userId],
    references: [user.id],
  }),
  notes: many(note),
  pdfDocuments: many(pdfDocument),
  flashcards: many(flashcard),
}));

export const noteRelations = relations(note, ({ one }) => ({
  folder: one(folder, {
    fields: [note.folderId],
    references: [folder.id],
  }),
  user: one(user, {
    fields: [note.userId],
    references: [user.id],
  }),
}));

export const pdfDocumentRelations = relations(pdfDocument, ({ one }) => ({
  folder: one(folder, {
    fields: [pdfDocument.folderId],
    references: [folder.id],
  }),
  user: one(user, {
    fields: [pdfDocument.userId],
    references: [user.id],
  }),
}));

export const flashcardRelations = relations(flashcard, ({ one }) => ({
  sourceNote: one(note, {
    fields: [flashcard.sourceNoteId],
    references: [note.id],
  }),
  folder: one(folder, {
    fields: [flashcard.folderId],
    references: [folder.id],
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
