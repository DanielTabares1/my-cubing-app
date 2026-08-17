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
  it('increments streak by 1 on good rating', () => {
    const rated = applyCaseRating(makeCase({ streak: 4 }), 'good');
    expect(rated.streak).toBe(5);
  });

  it('auto-learns when a good rating reaches MAX_STREAK (10)', () => {
    const rated = applyCaseRating(makeCase({ streak: MAX_STREAK - 1, isLearned: false }), 'good');
    expect(rated.streak).toBe(MAX_STREAK);
    expect(rated.isLearned).toBe(true);
  });

  it('does not exceed MAX_STREAK on good rating', () => {
    const rated = applyCaseRating(makeCase({ streak: MAX_STREAK, isLearned: true }), 'good');
    expect(rated.streak).toBe(MAX_STREAK);
    expect(rated.isLearned).toBe(true);
  });

  it('bad rating: streak < 6 resets to 0', () => {
    expect(applyCaseRating(makeCase({ streak: 0 }), 'bad').streak).toBe(0);
    expect(applyCaseRating(makeCase({ streak: 3 }), 'bad').streak).toBe(0);
    expect(applyCaseRating(makeCase({ streak: 5 }), 'bad').streak).toBe(0);
  });

  it('bad rating: streak 6–10 drops to 5', () => {
    expect(applyCaseRating(makeCase({ streak: 6 }), 'bad').streak).toBe(5);
    expect(applyCaseRating(makeCase({ streak: 8 }), 'bad').streak).toBe(5);
    expect(applyCaseRating(makeCase({ streak: MAX_STREAK }), 'bad').streak).toBe(5);
  });

  it('bad rating unlearns a learned case', () => {
    const rated = applyCaseRating(makeCase({ streak: MAX_STREAK, isLearned: true }), 'bad');
    expect(rated.isLearned).toBe(false);
    expect(rated.streak).toBe(5);
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
  it('shows Learned for full mastery', () => {
    expect(getCaseProgressBadge(makeCase({ isLearned: true, streak: MAX_STREAK }))).toBe('Learned');
  });

  it('shows racha for in-progress streaks', () => {
    expect(getCaseProgressBadge(makeCase({ streak: 3 }))).toBe('racha 3');
  });

  it('detects full mastery', () => {
    expect(isFullyLearned(makeCase({ isLearned: true, streak: MAX_STREAK }))).toBe(true);
    // isLearned: true with low streak gets normalized to MAX_STREAK, so also fully learned
    expect(isFullyLearned(makeCase({ isLearned: false, streak: 4 }))).toBe(false);
  });
});
