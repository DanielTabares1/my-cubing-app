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

/** Apply a post-case rating: GOOD increments streak (capped), BAD penalises streak. */
export function applyCaseRating(trainingCase: TrainingCase, rating: CaseRating): TrainingCase {
  const normalized = normalizeTrainingCase(trainingCase);

  if (rating === 'good') {
    const nextStreak = Math.min(MAX_STREAK, (normalized.streak ?? 0) + 1);
    return {
      ...normalized,
      streak: nextStreak,
      // Auto-mark as learned once streak reaches the maximum
      isLearned: nextStreak >= MAX_STREAK ? true : normalized.isLearned,
    };
  }

  // BAD: streak 6–10 → drops to 5 (stays "old" but needs more reps)
  //      streak < 6 → resets to 0 (back to fresh "new" case)
  const currentStreak = normalized.streak ?? 0;
  const nextStreak = currentStreak >= 6 ? 5 : 0;

  return {
    ...normalized,
    streak: nextStreak,
    // Un-learn if they had been marked learned
    isLearned: normalized.isLearned && nextStreak >= MAX_STREAK ? true : false,
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
