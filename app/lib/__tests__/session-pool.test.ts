import { describe, expect, it } from 'vitest';

import {
  buildSessionPool,
  getLearnedInclusionProbability,
} from '../session-pool';
import type { TrainingCase } from '../types';

function makeCase(
  par: string,
  overrides: Partial<TrainingCase> = {},
): TrainingCase {
  return {
    tipo: 'arista',
    par,
    memo: 'Memo',
    algoritmo: "R U R'",
    ...overrides,
  };
}

describe('getLearnedInclusionProbability', () => {
  it('returns 80% for streak 0 or 1', () => {
    expect(getLearnedInclusionProbability(0)).toBe(0.8);
    expect(getLearnedInclusionProbability(1)).toBe(0.8);
  });

  it('returns 50% for streak 2 or 3', () => {
    expect(getLearnedInclusionProbability(2)).toBe(0.5);
    expect(getLearnedInclusionProbability(3)).toBe(0.5);
  });

  it('returns 20% for streak 4 or higher', () => {
    expect(getLearnedInclusionProbability(4)).toBe(0.2);
    expect(getLearnedInclusionProbability(5)).toBe(0.2);
  });
});

describe('buildSessionPool', () => {
  it('always includes unlearned cases', () => {
    const cases = [
      makeCase('AB'),
      makeCase('AC', { isLearned: true, streak: 5 }),
    ];

    const pool = buildSessionPool(cases, () => 1);
    expect(pool.map((trainingCase) => trainingCase.par)).toContain('AB');
  });

  it('includes learned cases when random check passes', () => {
    const cases = [makeCase('AB', { isLearned: true, streak: 0 })];
    const pool = buildSessionPool(cases, () => 0);
    expect(pool).toHaveLength(1);
  });

  it('excludes learned cases when random check fails', () => {
    const cases = [makeCase('AB', { isLearned: true, streak: 5 })];
    const pool = buildSessionPool(cases, () => 0.99);
    expect(pool).toHaveLength(1);
  });

  it('never returns an empty pool when cases exist', () => {
    const cases = [
      makeCase('AB', { isLearned: true, streak: 5 }),
      makeCase('AC', { isLearned: true, streak: 4 }),
    ];
    const pool = buildSessionPool(cases, () => 0.99);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool[0]?.par).toBe('AC');
  });

  it('returns an empty array for no input cases', () => {
    expect(buildSessionPool([])).toEqual([]);
  });
});
