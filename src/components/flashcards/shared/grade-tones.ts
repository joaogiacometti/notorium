import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type { StatusTone } from "@/lib/ui/status-tones";

/** The one status tone per review grade, shared by grading and results. */
export const gradeTones: Record<ReviewGrade, StatusTone> = {
  again: "danger",
  hard: "warning",
  good: "info",
  easy: "success",
};
