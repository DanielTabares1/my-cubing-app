import { describe, expect, it } from 'vitest';

import {
  getCatalogStats,
  getRoundStats,
  partitionSessionPool,
} from '../round-stats';
import { MAX_STREAK } from '../session-pool';
import type { TrainingCase } from '../types';

function makeCase(par: string, progress?: Partial<Pick<TrainingCase, 'isLearned' | 'streak'>>): TrainingCase {
  return {
    tipo: 'arista',
    par,
    memo: 'memo',
    algoritmo: "R U R'",
    ...progress,
  };
}

describe('getCatalogStats', () => {
  it('counts total, learned (streak >= MAX_STREAK), and unlearned cases', () => {
    const stats = getCatalogStats([
      makeCase('AB', { streak: 0 }),                   // new
      makeCase('AC', { streak: MAX_STREAK }),            // old/learned
      makeCase('AD', { streak: MAX_STREAK }),            // old/learned
    ]);

    expect(stats).toEqual({ total: 3, unlearned: 1, learned: 2 });
  });

  it('counts isLearned cases with lower streak as unlearned', () => {
    // isLearned flag alone is not enough — streak must reach MAX_STREAK
    const stats = getCatalogStats([
      makeCase('AB', { isLearned: true, streak: 5 }),   // streak < MAX_STREAK(10) → unlearned
      makeCase('AC', { streak: MAX_STREAK }),            // old/learned
    ]);

    expect(stats).toEqual({ total: 2, unlearned: 1, learned: 1 });
  });
});

describe('partitionSessionPool', () => {
  it('splits new (streak < MAX_STREAK) and old review cases (streak >= MAX_STREAK)', () => {
    const pool = [
      makeCase('AB', { streak: 0 }),
      makeCase('AC', { streak: MAX_STREAK }),
      makeCase('AD', { streak: 5 }),
      makeCase('AE', { streak: MAX_STREAK }),
    ];

    const { unlearned, review } = partitionSessionPool(pool);

    expect(unlearned.map((c) => c.par)).toEqual(['AB', 'AD']);
    expect(review.map((c) => c.par)).toEqual(['AC', 'AE']);
  });
});

describe('getRoundStats', () => {
  it('derives completed and remaining from pool composition', () => {
    const pool = [
      makeCase('AB', { streak: 0 }),
      makeCase('AC', { streak: MAX_STREAK }),
      makeCase('AD', { streak: 3 }),
    ];

    expect(getRoundStats(pool, 3, 1)).toEqual({
      roundSize: 3,
      unlearnedInRound: 2,
      reviewInRound: 1,
      completed: 1,
      remaining: 2,
    });
  });

  it('clamps completed to round size', () => {
    const pool = [makeCase('AB', { streak: 0 })];

    expect(getRoundStats(pool, 1, 5)).toEqual({
      roundSize: 1,
      unlearnedInRound: 1,
      reviewInRound: 0,
      completed: 1,
      remaining: 0,
    });
  });

  it('returns null for an empty round', () => {
    expect(getRoundStats([], 0, 0)).toBeNull();
  });
});
