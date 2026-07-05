/**
 * Case progress mutations for spaced repetition (streak and learned flag).
 */

import type { TrainingCase } from './types';
import { MAX_STREAK } from './session-pool';
import { caseKey, normalizeTrainingCase } from './training-cases';

export type CaseRating = 'good' | 'bad';

/** Apply a post-case rating: GOOD increments streak (capped), BAD resets streak to 0. */
export function applyCaseRating(trainingCase: TrainingCase, rating: CaseRating): TrainingCase {
  const normalized = normalizeTrainingCase(trainingCase);

  if (rating === 'good') {
    return {
      ...normalized,
      streak: Math.min(MAX_STREAK, (normalized.streak ?? 0) + 1),
    };
  }

  return {
    ...normalized,
    streak: 0,
  };
}

/** Toggle the learned flag for a case. */
export function toggleCaseLearned(trainingCase: TrainingCase): TrainingCase {
  const normalized = normalizeTrainingCase(trainingCase);
  return {
    ...normalized,
    isLearned: !normalized.isLearned,
  };
}

/** Update one case in an array by stable case key. */
export function updateCaseInArray(
  cases: TrainingCase[],
  targetKey: string,
  updater: (trainingCase: TrainingCase) => TrainingCase,
): TrainingCase[] {
  return cases.map((trainingCase) =>
    caseKey(trainingCase) === targetKey ? updater(trainingCase) : trainingCase,
  );
}
