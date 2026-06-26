import { describe, expect, it } from 'vitest';

import {
  createShuffledQueue,
  popShuffledIndex,
  removeIndexFromQueue,
  shuffleIndices,
} from '../shuffled-selection';

describe('shuffleIndices', () => {
  it('returns a permutation of all indices', () => {
    const shuffled = shuffleIndices(5);
    expect(shuffled).toHaveLength(5);
    expect(new Set(shuffled)).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('returns an empty array for length 0', () => {
    expect(shuffleIndices(0)).toEqual([]);
  });
});

describe('popShuffledIndex', () => {
  it('returns every index exactly once before refilling', () => {
    const queue: number[] = [];
    const seen: number[] = [];

    for (let step = 0; step < 4; step++) {
      const index = popShuffledIndex(queue, 4);
      expect(index).not.toBeNull();
      seen.push(index as number);
    }

    expect(new Set(seen)).toEqual(new Set([0, 1, 2, 3]));
    expect(queue).toHaveLength(0);

    const fifth = popShuffledIndex(queue, 4);
    expect(fifth).not.toBeNull();
    expect(queue.length).toBeLessThan(4);
  });

  it('returns null for an empty pool', () => {
    const queue = createShuffledQueue(3);
    expect(popShuffledIndex(queue, 0)).toBeNull();
  });
});

describe('removeIndexFromQueue', () => {
  it('removes all occurrences of an index from the remaining queue', () => {
    const queue = [0, 2, 1, 2, 3];
    removeIndexFromQueue(queue, 2);
    expect(queue).toEqual([0, 1, 3]);
  });
});
