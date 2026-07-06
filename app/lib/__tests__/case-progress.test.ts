import { describe, expect, it } from 'vitest';

import {
  applyCaseRating,
  getCaseProgressBadge,
  isFullyLearned,
  toggleCaseLearned,
} from '../case-progress';
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

  it('auto-learns when a good rating reaches MAX_STREAK', () => {
    const rated = applyCaseRating(makeCase({ streak: 4, isLearned: false }), 'good');
    expect(rated.streak).toBe(MAX_STREAK);
    expect(rated.isLearned).toBe(true);
  });

  it('does not exceed MAX_STREAK on good rating', () => {
    const rated = applyCaseRating(makeCase({ streak: MAX_STREAK, isLearned: true }), 'good');
    expect(rated.streak).toBe(MAX_STREAK);
    expect(rated.isLearned).toBe(true);
  });

  it('resets streak and unlearns on bad rating for a learned case', () => {
    const rated = applyCaseRating(makeCase({ streak: 4, isLearned: true }), 'bad');
    expect(rated.streak).toBe(0);
    expect(rated.isLearned).toBe(false);
  });

  it('resets streak on bad rating without changing an unlearned case', () => {
    const rated = applyCaseRating(makeCase({ streak: 3, isLearned: false }), 'bad');
    expect(rated.streak).toBe(0);
    expect(rated.isLearned).toBe(false);
  });
});

describe('toggleCaseLearned', () => {
  it('marks learned with max streak', () => {
    const toggled = toggleCaseLearned(makeCase({ isLearned: false, streak: 2 }));
    expect(toggled.isLearned).toBe(true);
    expect(toggled.streak).toBe(MAX_STREAK);
  });

  it('unmarks learned and resets streak', () => {
    const toggled = toggleCaseLearned(makeCase({ isLearned: true, streak: MAX_STREAK }));
    expect(toggled.isLearned).toBe(false);
    expect(toggled.streak).toBe(0);
  });
});

describe('progress badge helpers', () => {
  it('shows Learned instead of racha 5 for full mastery', () => {
    expect(getCaseProgressBadge(makeCase({ isLearned: true, streak: MAX_STREAK }))).toBe('Learned');
  });

  it('shows racha for in-progress streaks', () => {
    expect(getCaseProgressBadge(makeCase({ streak: 3 }))).toBe('racha 3');
  });

  it('detects full mastery', () => {
    expect(isFullyLearned(makeCase({ isLearned: true, streak: MAX_STREAK }))).toBe(true);
    expect(isFullyLearned(makeCase({ isLearned: true, streak: 4 }))).toBe(false);
  });
});
