import { getRichTextExcerpt } from "@/lib/editor/rich-text";

const flashcardManageExcerptLength = 25;
const flashcardManageExcerptSourceLength = 300;

export function getFlashcardManageExcerpt(value: string) {
  return getRichTextExcerpt(value, flashcardManageExcerptLength);
}

export function getFlashcardManageExcerptSourceLength() {
  return flashcardManageExcerptSourceLength;
}
