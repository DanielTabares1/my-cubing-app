/**
 * Spaced-repetition session pool: probabilistic filter applied before shuffled selection.
 */

import type { TrainingCase } from './types';
import { normalizeTrainingCase } from './training-cases';

/**
 * Maximum streak. Cases with streak < MAX_STREAK are "new" and always included.
 * Cases with streak >= MAX_STREAK are "old" and capped to OLD_CASES_PER_SESSION.
 */
export const MAX_STREAK = 10;

/** How many old (fully-streaked) cases to include per session. */
export const OLD_CASES_PER_SESSION = 10;

/** Shuffle an array in-place using Fisher-Yates. */
function shuffleInPlace<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Builds the active practice pool for the current session round.
 *
 * - "New" cases (streak < MAX_STREAK) are always included — these need the mandatory reps.
 * - "Old" cases (streak >= MAX_STREAK) are capped at OLD_CASES_PER_SESSION, randomly
 *   sampled and weighted so lower-streak old cases appear more often than higher ones.
 * - Fail-safe: if somehow no cases make it in, force at least one.
 */
export function buildSessionPool(
  cases: TrainingCase[],
  random: () => number = Math.random,
): TrainingCase[] {
  if (cases.length === 0) return [];

  const normalized = cases.map(normalizeTrainingCase);

  // "New": streak < MAX_STREAK — always include, every session
  const newCases = normalized.filter((c) => (c.streak ?? 0) < MAX_STREAK);

  // "Old": streak >= MAX_STREAK — cap to OLD_CASES_PER_SESSION
  const oldCases = normalized.filter((c) => (c.streak ?? 0) >= MAX_STREAK);

  // Sample old cases: lower streak = higher weight (reviewed less recently)
  const sampledOld = sampleOldCases(oldCases, OLD_CASES_PER_SESSION, random);

  const pool = [...newCases, ...sampledOld];

  // Fail-safe: pool should never be empty when cases exist
  if (pool.length === 0) {
    pool.push(normalized[0]);
  }

  return pool;
}

/**
 * Randomly sample up to `limit` old cases.
 * Cases with lower streak get higher weight so they show up more often.
 */
function sampleOldCases(
  oldCases: TrainingCase[],
  limit: number,
  random: () => number,
): TrainingCase[] {
  if (oldCases.length === 0) return [];
  if (oldCases.length <= limit) return [...oldCases];

  // Weight: streak === MAX_STREAK gets weight 3, higher streaks get weight 1
  // This means cases that recently crossed the threshold appear ~3x more
  const weighted: TrainingCase[] = [];
  for (const c of oldCases) {
    const weight = (c.streak ?? 0) === MAX_STREAK ? 3 : 1;
    for (let i = 0; i < weight; i++) weighted.push(c);
  }

  shuffleInPlace(weighted, random);

  // Pick unique cases up to limit
  const seen = new Set<string>();
  const result: TrainingCase[] = [];
  for (const c of weighted) {
    const key = c.par;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(c);
      if (result.length >= limit) break;
    }
  }

  return result;
}
