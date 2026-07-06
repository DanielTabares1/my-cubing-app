/**
 * useCaseSelection property-based tests.
 * Feature: 3style-bld-edge-trainer
 *
 * Tests:
 *   Property 5 — Random Case Selection Coverage
 *   Property 6 — Sequential Case Selection Ordering
 */

import { describe, expect } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { renderHook, act } from '@testing-library/react';

import { useCaseSelection } from '../useCaseSelection';
import type { TrainingCase } from '../../lib/types';

// ---------------------------------------------------------------------------
// Shared helpers / generators
// ---------------------------------------------------------------------------

/** Build a minimal TrainingCase for testing. */
function makeCase(
  par: string,
  progress?: Partial<Pick<TrainingCase, 'isLearned' | 'streak'>>,
): TrainingCase {
  return { par, tipo: 'arista', memo: 'Test memo', algoritmo: 'R U R\'', ...progress };
}

/**
 * Arbitrary that generates a non-empty array of TrainingCase objects.
 * We generate distinct `par` labels ('A0', 'A1', …) so each case is
 * uniquely identifiable by index.
 */
const nonEmptyCasesArb: fc.Arbitrary<TrainingCase[]> = fc
  .integer({ min: 1, max: 30 })
  .chain((len) =>
    fc.constant(
      Array.from({ length: len }, (_, i) => makeCase(`A${i}`)),
    ),
  );

// ---------------------------------------------------------------------------
// Property 5 — Random Case Selection Coverage
// ---------------------------------------------------------------------------

// Feature: 3style-bld-edge-trainer, Property 5: Random Case Selection Coverage

describe('Property 5: Random Case Selection Coverage', () => {
  /**
   * For any non-empty array of TrainingCases, every result of `selectCase('random')`
   * must be a case that exists in the original array.
   *
   * We call selectCase N times (where N = cases.length * 3) to get decent coverage.
   *
   * **Validates: Requirements 8.2**
   */
  test.prop([nonEmptyCasesArb], { numRuns: 100 })(
    'every randomly selected case exists in the input array',
    (cases) => {
      const { result } = renderHook(() => useCaseSelection(cases));

      const pars = new Set(cases.map((c) => c.par));
      const iterations = cases.length * 3;

      for (let i = 0; i < iterations; i++) {
        let selected: TrainingCase | null = null;
        act(() => {
          selected = result.current.selectCase('random');
        });
        expect(selected).not.toBeNull();
        expect(pars.has((selected as TrainingCase).par)).toBe(true);
      }
    },
  );

  test('random mode covers every case once per shuffled round', () => {
    const cases = Array.from({ length: 8 }, (_, index) => makeCase(`A${index}`));
    const { result } = renderHook(() => useCaseSelection(cases));

    const round: string[] = [];
    for (let index = 0; index < cases.length; index++) {
      act(() => {
        const selected = result.current.selectCase('random');
        if (selected) round.push(selected.par);
      });
    }

    expect(round).toHaveLength(cases.length);
    expect(new Set(round)).toEqual(new Set(cases.map((trainingCase) => trainingCase.par)));
  });

  test('exposes catalog stats and round progress during random practice', () => {
    const cases = [
      makeCase('A0'),
      makeCase('A1', { isLearned: true }),
      makeCase('A2'),
      makeCase('A3', { isLearned: true }),
    ];
    const { result } = renderHook(() => useCaseSelection(cases));

    expect(result.current.catalogStats).toEqual({
      total: 4,
      unlearned: 2,
      learned: 2,
    });
    expect(result.current.roundStats).toBeNull();

    act(() => {
      result.current.selectCase('random');
    });

    expect(result.current.roundStats).not.toBeNull();
    expect(result.current.roundStats?.completed).toBe(1);
    expect(result.current.roundStats?.roundSize).toBeGreaterThan(0);
    expect(
      (result.current.roundStats?.unlearnedInRound ?? 0) +
        (result.current.roundStats?.reviewInRound ?? 0),
    ).toBe(result.current.roundStats?.roundSize);
  });

  test('random mode does not repeat until the round completes', () => {
    const cases = Array.from({ length: 6 }, (_, index) => makeCase(`B${index}`));
    const { result } = renderHook(() => useCaseSelection(cases));

    const seen = new Set<string>();
    for (let index = 0; index < cases.length; index++) {
      act(() => {
        const selected = result.current.selectCase('random');
        if (!selected) return;
        expect(seen.has(selected.par)).toBe(false);
        seen.add(selected.par);
      });
    }
  });

  test('notifyCasePracticed removes a manually selected case from the round', () => {
    const cases = [makeCase('AA'), makeCase('AB'), makeCase('AC')];
    const { result } = renderHook(() => useCaseSelection(cases));

    act(() => {
      result.current.notifyCasePracticed(cases[1]);
    });

    const round: string[] = [];
    for (let index = 0; index < cases.length - 1; index++) {
      act(() => {
        const selected = result.current.selectCase('random');
        if (selected) round.push(selected.par);
      });
    }

    expect(round).toHaveLength(2);
    expect(round).not.toContain('AB');
  });

  /**
   * When the cases array is empty, `selectCase('random')` must return null.
   *
   * **Validates: Requirements 8.4**
   */
  test('returns null for an empty cases array (random)', () => {
    const { result } = renderHook(() => useCaseSelection([]));
    let selected: TrainingCase | null = undefined as unknown as TrainingCase | null;
    act(() => {
      selected = result.current.selectCase('random');
    });
    expect(selected).toBeNull();
  });

  /**
   * hasMoreCases is true for non-empty arrays, false for empty arrays.
   */
  test.prop([nonEmptyCasesArb], { numRuns: 100 })(
    'hasMoreCases is true for any non-empty cases array',
    (cases) => {
      const { result } = renderHook(() => useCaseSelection(cases));
      expect(result.current.hasMoreCases).toBe(true);
    },
  );

  test('hasMoreCases is false for an empty cases array', () => {
    const { result } = renderHook(() => useCaseSelection([]));
    expect(result.current.hasMoreCases).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property 6 — Sequential Case Selection Ordering
// ---------------------------------------------------------------------------

// Feature: 3style-bld-edge-trainer, Property 6: Sequential Case Selection Ordering

describe('Property 6: Sequential Case Selection Ordering', () => {
  /**
   * For any non-empty array of TrainingCases, calling `selectCase('sequential')`
   * exactly `2 * length` times must return:
   *   - First pass  (indices 0…N-1):   cases[0], cases[1], …, cases[N-1]
   *   - Second pass (indices N…2N-1):  cases[0], cases[1], …, cases[N-1]  (wrap-around)
   *
   * **Validates: Requirements 8.3**
   */
  test.prop([nonEmptyCasesArb], { numRuns: 100 })(
    'sequential selection follows array order and wraps around',
    (cases) => {
      const { result } = renderHook(() => useCaseSelection(cases));

      const collected: TrainingCase[] = [];
      const iterations = cases.length * 2;

      for (let i = 0; i < iterations; i++) {
        act(() => {
          const selected = result.current.selectCase('sequential');
          if (selected !== null) collected.push(selected);
        });
      }

      expect(collected).toHaveLength(iterations);

      for (let i = 0; i < iterations; i++) {
        const expectedCase = cases[i % cases.length];
        expect(collected[i].par).toBe(expectedCase.par);
      }
    },
  );

  /**
   * When the cases array is empty, `selectCase('sequential')` must return null
   * and `currentIndex` must remain 0.
   *
   * **Validates: Requirements 8.4**
   */
  test('returns null for an empty cases array (sequential)', () => {
    const { result } = renderHook(() => useCaseSelection([]));
    let selected: TrainingCase | null = undefined as unknown as TrainingCase | null;
    act(() => {
      selected = result.current.selectCase('sequential');
    });
    expect(selected).toBeNull();
    expect(result.current.currentIndex).toBe(0);
  });
});
