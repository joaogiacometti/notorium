import { relations, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  date,
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
  assessmentStatusEnum,
  assessmentTypeEnum,
  flashcardReviewRatingEnum,
  flashcardStateEnum,
  flashcardTypeEnum,
  notificationStatusEnum,
  subjectKindEnum,
  userAccessStatusEnum,
} from "@/db/schema-enums";
import type { OcclusionRegion } from "@/features/flashcards/occlusion";

export * from "@/db/schema-enums";

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
  notificationsEnabled: boolean("notifications_enabled")
    .notNull()
    .default(false),
  notificationDaysBefore: integer("notification_days_before")
    .notNull()
    .default(1),
  readerColorInverted: boolean("reader_color_inverted")
    .notNull()
    .default(false),
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
    parentSubjectId: text("parent_subject_id").references(
      (): AnyPgColumn => subject.id,
      { onDelete: "cascade" },
    ),
    kind: subjectKindEnum("kind").notNull().default("academic"),
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
  (table) => [
    uniqueIndex("subject_userId_parentSubjectId_name_unique").on(
      table.userId,
      sql`coalesce(${table.parentSubjectId}, '__root_subject__')`,
      table.name,
    ),
    index("subject_parentSubjectId_idx").on(table.parentSubjectId),
    index("subject_userId_idx").on(table.userId),
    index("subject_name_trgm_idx").using("gin", table.name.op("gin_trgm_ops")),
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
    index("note_title_trgm_idx").using("gin", table.title.op("gin_trgm_ops")),
    index("note_content_trgm_idx").using(
      "gin",
      sql`coalesce(${table.content}, '') gin_trgm_ops`,
    ),
  ],
);

export const mindmap = pgTable(
  "mindmap",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    // JSON-serialized { nodes, edges } graph. Stored as text to mirror
    // note.content; always parsed/validated with Zod, never trusted raw.
    data: text("data"),
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
    index("mindmap_subjectId_idx").on(table.subjectId),
    index("mindmap_userId_idx").on(table.userId),
    index("mindmap_userId_updatedAt_idx").on(table.userId, table.updatedAt),
    index("mindmap_title_trgm_idx").using(
      "gin",
      table.title.op("gin_trgm_ops"),
    ),
  ],
);

export const deck = pgTable(
  "deck",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    parentDeckId: text("parent_deck_id").references(
      (): AnyPgColumn => deck.id,
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
    uniqueIndex("deck_userId_parentDeckId_name_unique").on(
      table.userId,
      sql`coalesce(${table.parentDeckId}, '__root_deck__')`,
      table.name,
    ),
    index("deck_userId_idx").on(table.userId),
    index("deck_parentDeckId_idx").on(table.parentDeckId),
    index("deck_userId_parentDeckId_idx").on(table.userId, table.parentDeckId),
  ],
);

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
    index("assessment_title_trgm_idx").using(
      "gin",
      table.title.op("gin_trgm_ops"),
    ),
    index("assessment_description_trgm_idx").using(
      "gin",
      sql`coalesce(${table.description}, '') gin_trgm_ops`,
    ),
  ],
);

export const assessmentAttachment = pgTable(
  "assessment_attachment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assessmentId: text("assessment_id")
      .notNull()
      .references((): AnyPgColumn => assessment.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    blobPathname: text("blob_pathname").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("assessment_attachment_assessmentId_idx").on(table.assessmentId),
    index("assessment_attachment_userId_idx").on(table.userId),
    index("assessment_attachment_userId_assessmentId_idx").on(
      table.userId,
      table.assessmentId,
    ),
  ],
);

export const libraryBook = pgTable(
  "library_book",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Migration A (additive): books are moving from the standalone /library into
    // the shared subject tree. subjectId is nullable until the backfill
    // (scripts/backfill-books-to-subjects.ts) repoints every legacy row into the
    // user's default "Library" subject. Migration B makes this notNull.
    subjectId: text("subject_id").references((): AnyPgColumn => subject.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    author: text("author"),
    fileName: text("file_name").notNull(),
    blobPathname: text("blob_pathname").notNull().unique(),
    sizeBytes: integer("size_bytes").notNull(),
    // Captured from the PDF on first successful render; null until then.
    totalPages: integer("total_pages"),
    // The reading position the user left off at. Defaults to the first page.
    currentPage: integer("current_page").notNull().default(1),
    // The reader zoom level the user left off at, persisted per device class so
    // a phone and a laptop keep independent zooms for the same book. Stored as a
    // serialized ZoomLevel (a "fit-page"/"fit-width"/"automatic" mode string or a
    // numeric scale as text); null means use the reader default (fit page).
    zoomMobile: text("zoom_mobile"),
    zoomDesktop: text("zoom_desktop"),
    lastReadAt: timestamp("last_read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("library_book_userId_idx").on(table.userId),
    index("library_book_userId_updatedAt_idx").on(
      table.userId,
      table.updatedAt,
    ),
    index("library_book_userId_subjectId_idx").on(
      table.userId,
      table.subjectId,
    ),
  ],
);

// One row per user-authored highlight in a book. The full EmbedPDF annotation
// object (geometry, color, quads, and the note text in its `contents` field) is
// stored as JSON so it round-trips back into the reader with no mapping. The PDF
// blob itself is never modified; the reader re-imports these rows on open.
export const libraryAnnotation = pgTable(
  "library_annotation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bookId: text("book_id")
      .notNull()
      .references(() => libraryBook.id, { onDelete: "cascade" }),
    // The annotation id EmbedPDF assigns in the reader. Stable across a reading
    // session, so it is the upsert key that ties an edit back to its row.
    annotationUid: text("annotation_uid").notNull(),
    pageIndex: integer("page_index").notNull(),
    // The serialized PdfAnnotationObject; `Date` fields are stored as ISO
    // strings and revived on load by the mappers.
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("library_annotation_book_uid_key").on(
      table.bookId,
      table.annotationUid,
    ),
    index("library_annotation_userId_idx").on(table.userId),
    index("library_annotation_bookId_idx").on(table.bookId),
  ],
);

export const notificationLog = pgTable(
  "notification_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assessmentId: text("assessment_id")
      .notNull()
      .references((): AnyPgColumn => assessment.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    notificationDate: date("notification_date", { mode: "string" }).notNull(),
    status: notificationStatusEnum("status").notNull().default("claimed"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("notification_log_assessmentId_userId_date_unique").on(
      table.assessmentId,
      table.userId,
      table.notificationDate,
    ),
    index("notification_log_userId_idx").on(table.userId),
    index("notification_log_assessmentId_idx").on(table.assessmentId),
  ],
);

export const flashcard = pgTable(
  "flashcard",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    front: text("front").notNull(),
    frontNormalized: text("front_normalized").notNull(),
    back: text("back").notNull(),
    type: flashcardTypeEnum("type").notNull().default("basic"),
    // Cloze siblings share one clozeNoteId. clozeOrdinal is the deletion this
    // card tests; clozeSource holds the authored `{{cN::answer}}` rich text so
    // edits can re-render every sibling. All three are null for basic cards.
    clozeNoteId: text("cloze_note_id"),
    clozeOrdinal: integer("cloze_ordinal"),
    clozeSource: text("cloze_source"),
    // Image occlusion siblings share one occlusionNoteId and the same source
    // image and region list; occlusionMaskId is the region this card tests.
    // All four are null for basic and cloze cards.
    occlusionNoteId: text("occlusion_note_id"),
    occlusionImagePathname: text("occlusion_image_pathname"),
    occlusionRegions: jsonb("occlusion_regions").$type<OcclusionRegion[]>(),
    occlusionMaskId: text("occlusion_mask_id"),
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
    // Migration A (additive): flashcards are moving from decks to subjects.
    // deckId is now nullable and vestigial — new cards are created against a
    // subject. Migration B drops deckId + the deck table once the backfill
    // (scripts/backfill-decks-to-subjects.ts) has repointed every legacy row.
    deckId: text("deck_id").references((): AnyPgColumn => deck.id, {
      onDelete: "cascade",
    }),
    // Nullable until the backfill repoints every row; Migration B makes this
    // notNull.
    subjectId: text("subject_id").references((): AnyPgColumn => subject.id, {
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
    unique("flashcard_userId_frontNormalized_unique").on(
      table.userId,
      table.frontNormalized,
    ),
    index("flashcard_deckId_idx").on(table.deckId),
    index("flashcard_subjectId_idx").on(table.subjectId),
    index("flashcard_userId_idx").on(table.userId),
    index("flashcard_clozeNoteId_idx").on(table.clozeNoteId),
    index("flashcard_occlusionNoteId_idx").on(table.occlusionNoteId),
    index("flashcard_dueAt_idx").on(table.dueAt),
    index("flashcard_userId_dueAt_idx").on(table.userId, table.dueAt),
    index("flashcard_userId_updatedAt_idx").on(table.userId, table.updatedAt),
    index("flashcard_userId_deckId_updatedAt_idx").on(
      table.userId,
      table.deckId,
      table.updatedAt,
    ),
    index("flashcard_userId_subjectId_updatedAt_idx").on(
      table.userId,
      table.subjectId,
      table.updatedAt,
    ),
    index("flashcard_front_trgm_idx").using(
      "gin",
      table.front.op("gin_trgm_ops"),
    ),
    index("flashcard_back_trgm_idx").using(
      "gin",
      table.back.op("gin_trgm_ops"),
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
    automaticOptimizationEnabled: boolean("automatic_optimization_enabled")
      .notNull()
      .default(false),
    legacySchedulerMigratedAt: timestamp("legacy_scheduler_migrated_at"),
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
    flashcardId: text("flashcard_id")
      .notNull()
      .references(() => flashcard.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientReviewId: text("client_review_id"),
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
    uniqueIndex("flashcard_review_log_userId_clientReviewId_unique")
      .on(table.userId, table.clientReviewId)
      .where(sql`${table.clientReviewId} is not null`),
  ],
);

export const flashcardMergeLog = pgTable(
  "flashcard_merge_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mergedFlashcardId: text("merged_flashcard_id").references(
      () => flashcard.id,
      { onDelete: "set null" },
    ),
    // Snapshot of the source card so lineage survives source deletion.
    sourceFlashcardId: text("source_flashcard_id"),
    sourceFront: text("source_front").notNull(),
    sourceBack: text("source_back").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("flashcard_merge_log_userId_idx").on(table.userId),
    index("flashcard_merge_log_mergedFlashcardId_idx").on(
      table.mergedFlashcardId,
    ),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  subjects: many(subject),
  notes: many(note),
  mindmaps: many(mindmap),
  attendanceMisses: many(attendanceMiss),
  assessments: many(assessment),
  assessmentAttachments: many(assessmentAttachment),
  flashcards: many(flashcard),
  flashcardReviewLogs: many(flashcardReviewLog),
  decks: many(deck),
  notificationLogs: many(notificationLog),
  libraryBooks: many(libraryBook),
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
  parentSubject: one(subject, {
    fields: [subject.parentSubjectId],
    references: [subject.id],
    relationName: "subjectHierarchy",
  }),
  childSubjects: many(subject, { relationName: "subjectHierarchy" }),
  user: one(user, {
    fields: [subject.userId],
    references: [user.id],
  }),
  notes: many(note),
  mindmaps: many(mindmap),
  attendanceMisses: many(attendanceMiss),
  assessments: many(assessment),
  flashcards: many(flashcard),
  books: many(libraryBook),
}));

export const libraryBookRelations = relations(libraryBook, ({ one, many }) => ({
  user: one(user, {
    fields: [libraryBook.userId],
    references: [user.id],
  }),
  subject: one(subject, {
    fields: [libraryBook.subjectId],
    references: [subject.id],
  }),
  annotations: many(libraryAnnotation),
}));

export const libraryAnnotationRelations = relations(
  libraryAnnotation,
  ({ one }) => ({
    user: one(user, {
      fields: [libraryAnnotation.userId],
      references: [user.id],
    }),
    book: one(libraryBook, {
      fields: [libraryAnnotation.bookId],
      references: [libraryBook.id],
    }),
  }),
);

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

export const mindmapRelations = relations(mindmap, ({ one }) => ({
  subject: one(subject, {
    fields: [mindmap.subjectId],
    references: [subject.id],
  }),
  user: one(user, {
    fields: [mindmap.userId],
    references: [user.id],
  }),
}));

export const assessmentRelations = relations(assessment, ({ one, many }) => ({
  subject: one(subject, {
    fields: [assessment.subjectId],
    references: [subject.id],
  }),
  user: one(user, {
    fields: [assessment.userId],
    references: [user.id],
  }),
  notificationLogs: many(notificationLog),
  attachments: many(assessmentAttachment),
}));

export const assessmentAttachmentRelations = relations(
  assessmentAttachment,
  ({ one }) => ({
    assessment: one(assessment, {
      fields: [assessmentAttachment.assessmentId],
      references: [assessment.id],
    }),
    user: one(user, {
      fields: [assessmentAttachment.userId],
      references: [user.id],
    }),
  }),
);

export const deckRelations = relations(deck, ({ one, many }) => ({
  parentDeck: one(deck, {
    fields: [deck.parentDeckId],
    references: [deck.id],
    relationName: "deckHierarchy",
  }),
  childDecks: many(deck, { relationName: "deckHierarchy" }),
  user: one(user, {
    fields: [deck.userId],
    references: [user.id],
  }),
  flashcards: many(flashcard),
}));

export const flashcardRelations = relations(flashcard, ({ one }) => ({
  deck: one(deck, {
    fields: [flashcard.deckId],
    references: [deck.id],
  }),
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

export const flashcardMergeLogRelations = relations(
  flashcardMergeLog,
  ({ one }) => ({
    mergedFlashcard: one(flashcard, {
      fields: [flashcardMergeLog.mergedFlashcardId],
      references: [flashcard.id],
    }),
    user: one(user, {
      fields: [flashcardMergeLog.userId],
      references: [user.id],
    }),
  }),
);

export const notificationLogRelations = relations(
  notificationLog,
  ({ one }) => ({
    assessment: one(assessment, {
      fields: [notificationLog.assessmentId],
      references: [assessment.id],
    }),
    user: one(user, {
      fields: [notificationLog.userId],
      references: [user.id],
    }),
  }),
);
