/**
 * Returns a shuffled copy of the cards so each exam visits them in a fresh
 * order. Pure Fisher-Yates over a copy; the input is never mutated.
 *
 * @example
 * const examOrder = shuffleExamCards(cards);
 */
export function shuffleExamCards<T>(cards: readonly T[]): T[] {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}
