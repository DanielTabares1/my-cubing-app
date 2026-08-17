import { describe, expect, it } from 'vitest';

import { buildSessionPool, MAX_STREAK, OLD_CASES_PER_SESSION } from '../session-pool';
import type { TrainingCase } from '../types';

function makeCase(
  par: string,
  overrides: Partial<TrainingCase> = {},
): TrainingCase {
  return {
    tipo: 'arista',
    par,
    memo: 'Memo',
    algoritmo: "R U R'",
    ...overrides,
  };
}

describe('buildSessionPool', () => {
  it('always includes new cases (streak < MAX_STREAK)', () => {
    const cases = [
      makeCase('AB', { streak: 0 }),
      makeCase('AC', { streak: MAX_STREAK }),
    ];

    const pool = buildSessionPool(cases, () => 1);
    const pars = pool.map((c) => c.par);
    expect(pars).toContain('AB');
  });

  it('includes old cases (streak >= MAX_STREAK) up to OLD_CASES_PER_SESSION', () => {
    // Create 20 old cases
    const cases = Array.from({ length: 20 }, (_, i) =>
      makeCase(`A${String.fromCharCode(65 + i)}`, { streak: MAX_STREAK }),
    );

    const pool = buildSessionPool(cases, Math.random);
    expect(pool.length).toBeLessThanOrEqual(OLD_CASES_PER_SESSION);
    expect(pool.length).toBeGreaterThan(0);
  });

  it('includes all old cases when count is at or below the cap', () => {
    const cases = [
      makeCase('AB', { streak: MAX_STREAK }),
      makeCase('AC', { streak: MAX_STREAK }),
      makeCase('AD', { streak: MAX_STREAK }),
    ];

    const pool = buildSessionPool(cases, Math.random);
    expect(pool.length).toBe(3);
  });

  it('includes both new and old cases in the same pool', () => {
    const cases = [
      makeCase('AB', { streak: 0 }),
      makeCase('AC', { streak: MAX_STREAK }),
    ];

    const pool = buildSessionPool(cases, Math.random);
    const pars = pool.map((c) => c.par);
    expect(pars).toContain('AB');
    expect(pars).toContain('AC');
  });

  it('never returns an empty pool when cases exist', () => {
    const cases = [makeCase('AB', { streak: MAX_STREAK })];
    const pool = buildSessionPool(cases, () => 0.99);
    expect(pool.length).toBeGreaterThan(0);
  });

  it('returns an empty array for no input cases', () => {
    expect(buildSessionPool([])).toEqual([]);
  });
});
