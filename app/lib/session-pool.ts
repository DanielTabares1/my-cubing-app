/**
 * Spaced-repetition session pool: probabilistic filter applied before shuffled selection.
 */

import type { TrainingCase } from './types';
import { normalizeTrainingCase } from './training-cases';

/** Maximum consecutive successful recalls tracked per case. */
export const MAX_STREAK = 5;

/** Inclusion probability for learned cases by current streak. */
export function getLearnedInclusionProbability(streak: number): number {
  if (streak <= 1) return 0.8;
  if (streak <= 3) return 0.5;
  return 0.2;
}

/**
 * Builds the active practice pool for the current session round.
 *
 * - Unlearned cases are always included.
 * - Learned cases pass a random inclusion check based on streak.
 * - Fail-safe: if every learned case is filtered out, the lowest-streak learned
 *   case is forced in (or the first available case when all are learned).
 */
export function buildSessionPool(
  cases: TrainingCase[],
  random: () => number = Math.random,
): TrainingCase[] {
  if (cases.length === 0) return [];

  const normalized = cases.map(normalizeTrainingCase);
  const unlearned = normalized.filter((trainingCase) => !trainingCase.isLearned);
  const learned = normalized.filter((trainingCase) => trainingCase.isLearned);

  const pool = [...unlearned];

  for (const trainingCase of learned) {
    const probability = getLearnedInclusionProbability(trainingCase.streak ?? 0);
    if (random() < probability) {
      pool.push(trainingCase);
    }
  }

  if (pool.length === 0) {
    const fallback = [...learned].sort(
      (left, right) => (left.streak ?? 0) - (right.streak ?? 0),
    );
    pool.push(fallback[0] ?? normalized[0]);
  }

  return pool;
}
