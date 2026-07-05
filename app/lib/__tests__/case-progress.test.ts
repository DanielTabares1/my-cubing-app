import { describe, expect, it } from 'vitest';

import { applyCaseRating, toggleCaseLearned } from '../case-progress';
import { MAX_STREAK } from '../session-pool';
import type { TrainingCase } from '../types';

function makeCase(overrides: Partial<TrainingCase> = {}): TrainingCase {
  return {
    tipo: 'arista',
    par: 'AB',
    memo: 'Airplane',
    algoritmo: "R U R'",
    isLearned: false,
    streak: 0,
    ...overrides,
  };
}

describe('applyCaseRating', () => {
  it('increments streak on good rating up to the cap', () => {
    const rated = applyCaseRating(makeCase({ streak: 4 }), 'good');
    expect(rated.streak).toBe(5);
  });

  it('does not exceed MAX_STREAK on good rating', () => {
    const rated = applyCaseRating(makeCase({ streak: MAX_STREAK }), 'good');
    expect(rated.streak).toBe(MAX_STREAK);
  });

  it('resets streak to 0 on bad rating', () => {
    const rated = applyCaseRating(makeCase({ streak: 4, isLearned: true }), 'bad');
    expect(rated.streak).toBe(0);
  });
});

describe('toggleCaseLearned', () => {
  it('flips the learned flag', () => {
    expect(toggleCaseLearned(makeCase({ isLearned: false })).isLearned).toBe(true);
    expect(toggleCaseLearned(makeCase({ isLearned: true })).isLearned).toBe(false);
  });
});
