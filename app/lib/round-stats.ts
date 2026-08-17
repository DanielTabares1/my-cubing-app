/**
 * Catalog and round progress stats for spaced-repetition practice.
 */

import type { TrainingCase } from './types';
import { normalizeTrainingCase } from './training-cases';
import { MAX_STREAK } from './session-pool';

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
  const learned = normalized.filter((c) => (c.streak ?? 0) >= MAX_STREAK).length;

  return {
    total: normalized.length,
    unlearned: normalized.length - learned,
    learned,
  };
}

/** Split a session pool into always-included new cases and old review cases. */
export function partitionSessionPool(pool: TrainingCase[]): {
  unlearned: TrainingCase[];
  review: TrainingCase[];
} {
  const normalized = pool.map(normalizeTrainingCase);
  // "New" = streak < MAX_STREAK (always in session, mandatory reps)
  // "Old" = streak >= MAX_STREAK (capped to ~10 review slots)
  const unlearned = normalized.filter((c) => (c.streak ?? 0) < MAX_STREAK);
  const review = normalized.filter((c) => (c.streak ?? 0) >= MAX_STREAK);

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
