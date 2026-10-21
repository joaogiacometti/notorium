/** A leech card the Refine view offers to improve. */
export interface StrugglingFlashcard {
  id: string;
  front: string;
  back: string;
  subjectId: string | null;
  subjectName: string;
  reviewCount: number;
  lapseCount: number;
}
