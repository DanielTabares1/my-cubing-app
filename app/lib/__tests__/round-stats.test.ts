import { describe, expect, it } from 'vitest';

import {
  getCatalogStats,
  getRoundStats,
  partitionSessionPool,
} from '../round-stats';
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
  it('counts total, learned, and unlearned cases', () => {
    const stats = getCatalogStats([
      makeCase('AB'),
      makeCase('AC', { isLearned: true }),
      makeCase('AD', { isLearned: true }),
    ]);

    expect(stats).toEqual({ total: 3, unlearned: 1, learned: 2 });
  });
});

describe('partitionSessionPool', () => {
  it('splits unlearned and review cases', () => {
    const pool = [
      makeCase('AB'),
      makeCase('AC', { isLearned: true }),
      makeCase('AD'),
      makeCase('AE', { isLearned: true }),
    ];

    const { unlearned, review } = partitionSessionPool(pool);

    expect(unlearned.map((trainingCase) => trainingCase.par)).toEqual(['AB', 'AD']);
    expect(review.map((trainingCase) => trainingCase.par)).toEqual(['AC', 'AE']);
  });
});

describe('getRoundStats', () => {
  it('derives completed and remaining from pool composition', () => {
    const pool = [
      makeCase('AB'),
      makeCase('AC', { isLearned: true }),
      makeCase('AD'),
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
    const pool = [makeCase('AB')];

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
