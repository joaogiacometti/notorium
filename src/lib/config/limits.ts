export const LIMITS = {
  maxSubjects: 50,
  maxChildSubjectsPerSubject: 50,
  maxSubjectNestingDepth: 4,
  maxNotesPerSubject: 100,
  maxMindmapsPerSubject: 100,
  maxNodesPerMindmap: 200,
  maxAttachmentsPerMindmap: 50,
  mindmapTitleMax: 200,
  mindmapEdgeLabelMax: 100,
  mindmapDataMaxBytes: 200000,
  maxAttachmentsPerNote: 20,
  maxAttachmentsPerFlashcard: 10,
  maxAttachmentsPerAssessment: 10,
  maxAssessmentsPerSubject: 50,
  maxFlashcardsPerDeck: 2000,
  maxDecksPerUser: 200,
  maxChildDecksPerDeck: 50,
  maxDeckNestingDepth: 4,

  deckNameMax: 100,

  noteTitleMax: 200,
  noteContentMax: 100000,
  noteContentPreviewLength: 100,
  // 4 MB. Editor/occlusion images upload as multipart bytes to the
  // /api/attachments/image route handler; Vercel caps function request bodies at
  // 4.5 MB, so the accepted size stays safely below that (with multipart
  // overhead headroom). Server-side optimization shrinks most uploads further.
  attachmentMaxBytes: 4194304,
  assessmentAttachmentMaxBytes: 10485760,
  attachmentSignedReadTtlSeconds: 300,
  attachmentUploadRateLimitPrefix: "ratelimit:attachments:upload",
  attachmentUploadRateLimitPerDay: 200,

  maxBooksPerUser: 100,
  libraryBookMaxBytes: 20971520,
  libraryBookTitleMax: 200,
  libraryBookAuthorMax: 200,
  libraryUploadRateLimitPrefix: "ratelimit:library:upload",
  libraryUploadRateLimitPerDay: 50,
  maxAnnotationsPerBook: 5000,
  libraryAnnotationNoteMax: 4000,

  flashcardFrontMax: 1000,
  flashcardBackMax: 4000,
  flashcardAiMaxInput: 10000,
  flashcardAiMaxOutput: 50,
  flashcardBatchSize: 500,
  flashcardAiFrontMax: 500,
  flashcardAiBackMax: 400,
  maxOcclusionRegionsPerNote: 50,
  occlusionLabelMax: 200,

  subjectNameMax: 100,

  assessmentTitleMax: 100,
  assessmentDescriptionMax: 1000,
  assessmentScoreMax: 100,
  assessmentWeightMax: 100,

  attendanceTotalClassesMax: 365,
  attendanceMaxMissesMax: 365,

  accountNameMax: 100,

  authEmailMax: 254,
  authPasswordMin: 8,
  authPasswordMax: 128,
  authNameMin: 2,
  authNameMax: 100,

  searchQueryMin: 2,
  searchQueryMax: 200,
  searchResultsLimit: 50,
  recentItemsLimit: 10,
  contentPreviewTruncate: 100,

  reviewDueLimitDefault: 50,
  reviewDueLimitMax: 200,

  pageSizeMin: 1,
  pageSizeMax: 500,

  authRateLimitMaxAttempts: 10,
  authRateLimitWindowSeconds: 60,
  authRateLimitPrefix: "ratelimit:auth",
  passwordResetRateLimitPrefix: "ratelimit:auth:password-reset",
  passwordResetRateLimitPerDay: 3,
  aiBackGenerationRateLimitPrefix: "ratelimit:ai:back",
  aiFlashcardGenerationRateLimitPrefix: "ratelimit:ai:generation",
  aiValidationRateLimitPrefix: "ratelimit:ai:validation",
  aiMergeSynthesisRateLimitPrefix: "ratelimit:ai:merge",
  aiBackGenerationRateLimitPerDay: 500,
  aiFlashcardGenerationRateLimitPerDay: 250,
  aiValidationRateLimitPerDay: 200,
  aiMergeSynthesisRateLimitPerDay: 100,
  trustedProxyCount: 0,
  ipAddressMaxLength: 64,
} as const;

export const AI_LIMITS = {
  maxBackTokens: 100,
  improveMaxTokens: 300,
  maxGenerationTokens: 4000,
  maxValidationTokens: 500,
  maxValidationExplanationLength: 300,
  maxMergeSynthesisTokens: 800,
  maxMergeRationaleLength: 300,
} as const;
