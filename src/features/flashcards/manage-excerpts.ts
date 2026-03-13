import { getRichTextExcerpt } from "@/lib/editor/rich-text";

const flashcardManageBackExcerptLength = 25;
const flashcardManageBackExcerptSourceLength = 300;

export function getFlashcardManageBackExcerpt(value: string) {
  return getRichTextExcerpt(value, flashcardManageBackExcerptLength);
}

export function getFlashcardManageBackExcerptSourceLength() {
  return flashcardManageBackExcerptSourceLength;
}
