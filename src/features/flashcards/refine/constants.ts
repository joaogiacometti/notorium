/**
 * Thresholds for the Refine view's struggling cards (leeches).
 *
 * Struggling: lapsed at least REFINE_LEECH_LAPSES times, matching Anki's first
 * leech warning (half its default threshold of 8). A card leaves the list once
 * its last REFINE_RECOVERY_STREAK reviews are all good/easy, so an improved
 * card drops off after it proves itself.
 */
export const REFINE_LEECH_LAPSES = 4;
export const REFINE_RECOVERY_STREAK = 3;
export const REFINE_CARD_LIMIT = 50;
