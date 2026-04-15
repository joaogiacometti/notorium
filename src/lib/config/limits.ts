export const LIMITS = {
  maxSubjects: 50,
  maxNotesPerSubject: 100,
  maxAttachmentsPerNote: 20,
  maxAttachmentsPerFlashcard: 10,
  maxAssessmentsPerSubject: 50,
  maxFlashcardsPerDeck: 2000,
  maxDecksPerUser: 200,
  maxChildDecksPerDeck: 50,
  maxDeckNestingDepth: 4,

  deckNameMax: 100,

  noteTitleMax: 200,
  noteContentMax: 100000,
  noteContentPreviewLength: 100,
  attachmentMaxBytes: 5242880,
  attachmentSignedReadTtlSeconds: 300,
  attachmentUploadRateLimitPrefix: "ratelimit:attachments:upload",
  attachmentUploadRateLimitPerDay: 200,

  flashcardFrontMax: 1000,
  flashcardBackMax: 4000,
  flashcardAiMaxInput: 10000,
  flashcardAiMaxOutput: 50,
  flashcardBatchSize: 500,
  flashcardAiFrontMax: 500,
  flashcardAiBackMax: 400,

  subjectNameMax: 100,
  subjectDescriptionMax: 500,

  assessmentTitleMax: 100,
  assessmentDescriptionMax: 1000,
  assessmentScoreMax: 100,
  assessmentWeightMax: 100,

  attendanceTotalClassesMax: 365,
  attendanceMaxMissesMax: 365,

  accountNameMax: 100,
  accountAiModelMax: 150,
  accountAiApiKeyMax: 500,

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
  pageSizeMax: 100,

  authRateLimitMaxAttempts: 10,
  authRateLimitWindowSeconds: 60,
  authRateLimitPrefix: "ratelimit:auth",
  trustedProxyCount: 0,
  ipAddressMaxLength: 64,
} as const;

export const AI_LIMITS = {
  maxBackTokens: 100,
  improveMaxTokens: 300,
  maxGenerationTokens: 4000,
  maxValidationTokens: 500,
  maxValidationExplanationLength: 300,
} as const;
