/**
 * Catalog and round progress stats for spaced-repetition practice.
 */

import type { TrainingCase } from './types';
import { normalizeTrainingCase } from './training-cases';

export interface CatalogStats {
  total: number;
  unlearned: number;
  learned: number;
}

export interface RoundStats {
  roundSize: number;
  unlearnedInRound: number;
  reviewInRound: number;
  completed: number;
  remaining: number;
}

/** Aggregate learned / unlearned counts for the active practice set. */
export function getCatalogStats(cases: TrainingCase[]): CatalogStats {
  const normalized = cases.map(normalizeTrainingCase);
  const learned = normalized.filter((trainingCase) => trainingCase.isLearned).length;

  return {
    total: normalized.length,
    unlearned: normalized.length - learned,
    learned,
  };
}

/** Split a session pool into always-included new cases and learned review cases. */
export function partitionSessionPool(pool: TrainingCase[]): {
  unlearned: TrainingCase[];
  review: TrainingCase[];
} {
  const normalized = pool.map(normalizeTrainingCase);
  const unlearned = normalized.filter((trainingCase) => !trainingCase.isLearned);
  const review = normalized.filter((trainingCase) => trainingCase.isLearned);

  return { unlearned, review };
}

/** Build a round snapshot from the fixed pool size and how many cases are done. */
export function getRoundStats(
  pool: TrainingCase[],
  roundSize: number,
  completed: number,
): RoundStats | null {
  if (roundSize <= 0) return null;

  const { unlearned, review } = partitionSessionPool(pool);
  const clampedCompleted = Math.min(Math.max(0, completed), roundSize);

  return {
    roundSize,
    unlearnedInRound: unlearned.length,
    reviewInRound: review.length,
    completed: clampedCompleted,
    remaining: roundSize - clampedCompleted,
  };
}
