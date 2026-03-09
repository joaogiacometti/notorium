export const LIMITS = {
  maxSubjects: 20,
  maxNotesPerSubject: 30,
  maxAssessmentsPerSubject: 15,
  maxFlashcardsPerSubject: 500,
  authRateLimitMaxAttempts: 10,
  authRateLimitWindowSeconds: 60,
  authRateLimitPrefix: "ratelimit:auth",
  maxImportBytes: 1048576,
  trustedProxyCount: 0,
} as const;
