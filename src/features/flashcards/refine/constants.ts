/**
 * Streak thresholds and candidate limits for the Refine view.
 *
 * Mastered: last N reviews are all good/easy. Struggling: last N reviews are
 * all "again" ("hard" is neutral and breaks both streaks).
 */
export const REFINE_MASTERED_STREAK = 3;
export const REFINE_STRUGGLING_STREAK = 3;
export const REFINE_GROUP_LIMIT = 50;

export const REFINE_MERGE_CANDIDATE_LIMIT = 8;
export const REFINE_FRONT_SIMILARITY_THRESHOLD = 0.25;
export const REFINE_BACK_SIMILARITY_THRESHOLD = 0.2;
