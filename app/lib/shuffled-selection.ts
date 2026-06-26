/**
 * Shuffled playlist selection: every case appears once per round before any repeat.
 */

/** Fisher–Yates shuffle of [0 .. length - 1]. */
export function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, index) => index);

  for (let index = indices.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }

  return indices;
}

export function createShuffledQueue(length: number): number[] {
  if (length <= 0) return [];
  return shuffleIndices(length);
}

/**
 * Pops the next shuffled index. Refills with a fresh shuffle when the round ends.
 */
export function popShuffledIndex(queue: number[], poolLength: number): number | null {
  if (poolLength <= 0) return null;

  if (queue.length === 0) {
    queue.push(...createShuffledQueue(poolLength));
  }

  return queue.pop() ?? null;
}

/** Remove a case index from the remaining queue (e.g. after manual search selection). */
export function removeIndexFromQueue(queue: number[], index: number): void {
  if (index < 0) return;

  for (let position = queue.length - 1; position >= 0; position--) {
    if (queue[position] === index) {
      queue.splice(position, 1);
    }
  }
}
