/**
 * Case progress mutations for spaced repetition (streak and learned flag).
 */

import type { TrainingCase } from './types';
import { MAX_STREAK } from './session-pool';
import { caseKey, normalizeTrainingCase } from './training-cases';

export type CaseRating = 'good' | 'bad';

/** True when a case has reached full mastery (learned with max streak). */
export function isFullyLearned(trainingCase: TrainingCase): boolean {
  const normalized = normalizeTrainingCase(trainingCase);
  return Boolean(normalized.isLearned) && (normalized.streak ?? 0) >= MAX_STREAK;
}

/** Secondary progress label for the trainer card; null when nothing extra to show. */
export function getCaseProgressBadge(trainingCase: TrainingCase): string | null {
  const normalized = normalizeTrainingCase(trainingCase);

  if (isFullyLearned(normalized)) {
    return 'Learned';
  }

  if ((normalized.streak ?? 0) > 0) {
    return `racha ${normalized.streak ?? 0}`;
  }

  return null;
}

/** Apply a post-case rating: GOOD increments streak (capped), BAD resets streak and unlearns. */
export function applyCaseRating(trainingCase: TrainingCase, rating: CaseRating): TrainingCase {
  const normalized = normalizeTrainingCase(trainingCase);

  if (rating === 'good') {
    const nextStreak = Math.min(MAX_STREAK, (normalized.streak ?? 0) + 1);
    return {
      ...normalized,
      streak: nextStreak,
      isLearned: nextStreak >= MAX_STREAK ? true : normalized.isLearned,
    };
  }

  return {
    ...normalized,
    streak: 0,
    isLearned: normalized.isLearned ? false : normalized.isLearned,
  };
}

/** Toggle the learned flag for a case. */
export function toggleCaseLearned(trainingCase: TrainingCase): TrainingCase {
  const normalized = normalizeTrainingCase(trainingCase);
  const nextLearned = !normalized.isLearned;

  return {
    ...normalized,
    isLearned: nextLearned,
    streak: nextLearned ? MAX_STREAK : 0,
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
