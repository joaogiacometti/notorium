export const LIMITS = {
  maxSubjects: 50,
  maxChildSubjectsPerSubject: 50,
  maxSubjectNestingDepth: 4,
  maxNotesPerSubject: 100,
  maxMindmapsPerSubject: 100,
  maxNodesPerMindmap: 200,
  maxAttachmentsPerMindmap: 50,
  mindmapTitleMax: 200,
  mindmapNodeLabelMax: 4000,
  mindmapEdgeLabelMax: 100,
  mindmapDataMaxBytes: 200000,
  maxAttachmentsPerNote: 20,
  maxAttachmentsPerFlashcard: 10,
  maxFlashcardsPerSubject: 2000,

  noteTitleMax: 200,
  noteContentMax: 100000,
  noteContentPreviewLength: 100,
  // 4 MB. Editor images upload as multipart bytes to the
  // /api/attachments/image route handler; Vercel caps function request bodies at
  // 4.5 MB, so the accepted size stays safely below that (with multipart
  // overhead headroom). Server-side optimization shrinks most uploads further.
  attachmentMaxBytes: 4194304,
  attachmentSignedReadTtlSeconds: 300,
  attachmentUploadRateLimitPrefix: "ratelimit:attachments:upload",
  attachmentUploadRateLimitPerDay: 200,

  flashcardFrontMax: 1000,
  flashcardBackMax: 4000,
  flashcardAiMaxInput: 10000,
  flashcardAiMaxOutput: 50,
  flashcardBatchSize: 500,
  // Ids per GET /api/flashcards/contents request. 100 UUIDs keep the query
  // string near 4 KB, well under proxy URL limits; the client splits larger
  // copy selections into several requests.
  flashcardContentsReadMax: 100,
  flashcardAiFrontMax: 500,
  flashcardAiBackMax: 1200,

  subjectNameMax: 100,

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
  aiAssistantRateLimitPrefix: "ratelimit:ai:assistant",
  aiAssistantRateLimitPerDay: 300,
  // The whole chat is resent each turn (it is not persisted), so these caps
  // bound the prompt size of every assistant request.
  assistantMaxMessages: 20,
  assistantMessageMaxChars: 4000,
  // Far above what `AI_LIMITS.assistantMaxOutputTokens` can produce at any
  // tokenizer ratio: a reply over it would make every later turn fail.
  assistantReplyMaxChars: 16000,
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
  assistantMaxOutputTokens: 1200,
} as const;
