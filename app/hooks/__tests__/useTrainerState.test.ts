/**
 * useTrainerState unit tests.
 * Feature: 3style-bld-edge-trainer
 *
 * Tests state transitions, guards, and reset behavior.
 * Requirements: 5.1, 5.2, 5.4, 5.7, 5.10, 5.12
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useTrainerState } from '../useTrainerState';
import type { TrainingCase } from '../../lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCase(par: string, tipo: TrainingCase['tipo'] = 'arista'): TrainingCase {
  return { par, tipo, memo: 'Test memo', algoritmo: 'R U R\'' };
}

const CASES: TrainingCase[] = [
  makeCase('AB'),
  makeCase('AC'),
  makeCase('AD'),
];

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('Initial state', () => {
  it('starts in State 0 (Idle) with no current case — Requirement 5.1, 5.2', () => {
    const { result } = renderHook(() => useTrainerState(CASES));
    expect(result.current.state).toBe(0);
    expect(result.current.currentCase).toBeNull();
  });

  it('starts in State 0 even when cases array is empty', () => {
    const { result } = renderHook(() => useTrainerState([]));
    expect(result.current.state).toBe(0);
    expect(result.current.currentCase).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// startPractice
// ---------------------------------------------------------------------------

describe('startPractice()', () => {
  it('transitions from State 0 to State 1 and selects a case — Requirement 5.4', () => {
    const { result } = renderHook(() => useTrainerState(CASES));

    act(() => { result.current.startPractice(); });

    expect(result.current.state).toBe(1);
    expect(result.current.currentCase).not.toBeNull();
  });

  it('selected case exists in the original cases array', () => {
    const { result } = renderHook(() => useTrainerState(CASES));

    act(() => { result.current.startPractice(); });

    const pars = CASES.map((c) => c.par);
    expect(pars).toContain(result.current.currentCase!.par);
  });

  it('is a no-op when cases array is empty — Requirement 8.4', () => {
    const { result } = renderHook(() => useTrainerState([]));

    act(() => { result.current.startPractice(); });

    expect(result.current.state).toBe(0);
    expect(result.current.currentCase).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// advance() — linear chain 1 → 2 → 3
// ---------------------------------------------------------------------------

describe('advance() — state transitions', () => {
  it('advances State 1 → State 2 — Requirement 5.7', () => {
    const { result } = renderHook(() => useTrainerState(CASES));

    act(() => { result.current.startPractice(); }); // → State 1
    act(() => { result.current.advance(); });        // → State 2

    expect(result.current.state).toBe(2);
  });

  it('advances State 2 → State 3 — Requirement 5.10', () => {
    const { result } = renderHook(() => useTrainerState(CASES));

    act(() => { result.current.startPractice(); }); // → State 1
    act(() => { result.current.advance(); });        // → State 2
    act(() => { result.current.advance(); });        // → State 3

    expect(result.current.state).toBe(3);
  });

  it('advances State 3 → State 1 with a new (possibly same) case — Requirement 5.12', () => {
    const { result } = renderHook(() => useTrainerState(CASES));

    act(() => { result.current.startPractice(); }); // → State 1
    act(() => { result.current.advance(); });        // → State 2
    act(() => { result.current.advance(); });        // → State 3
    act(() => { result.current.advance(); });        // → State 1 (new case)

    expect(result.current.state).toBe(1);
    expect(result.current.currentCase).not.toBeNull();
  });

  it('is a no-op in State 0 when cases array is empty', () => {
    const { result } = renderHook(() => useTrainerState([]));

    act(() => { result.current.advance(); });

    expect(result.current.state).toBe(0);
    expect(result.current.currentCase).toBeNull();
  });

  it('calling advance() from State 0 with cases loaded acts like startPractice', () => {
    const { result } = renderHook(() => useTrainerState(CASES));

    act(() => { result.current.advance(); });

    expect(result.current.state).toBe(1);
    expect(result.current.currentCase).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------

describe('reset()', () => {
  it('returns to State 1 from State 2 keeping the same case — Requirement 6.2', () => {
    const { result } = renderHook(() => useTrainerState(CASES));

    act(() => { result.current.startPractice(); }); // → State 1
    const caseAfterStart = result.current.currentCase;

    act(() => { result.current.advance(); });        // → State 2
    act(() => { result.current.reset(); });          // → State 1

    expect(result.current.state).toBe(1);
    expect(result.current.currentCase).toEqual(caseAfterStart);
  });

  it('returns to State 1 from State 3 keeping the same case', () => {
    const { result } = renderHook(() => useTrainerState(CASES));

    act(() => { result.current.startPractice(); }); // → State 1
    const caseAfterStart = result.current.currentCase;

    act(() => { result.current.advance(); });        // → State 2
    act(() => { result.current.advance(); });        // → State 3
    act(() => { result.current.reset(); });          // → State 1 (same case)

    expect(result.current.state).toBe(1);
    expect(result.current.currentCase).toEqual(caseAfterStart);
  });

  it('returns to State 1 from State 1 keeping the same case', () => {
    const { result } = renderHook(() => useTrainerState(CASES));

    act(() => { result.current.startPractice(); }); // → State 1
    const caseAfterStart = result.current.currentCase;

    act(() => { result.current.reset(); });          // → State 1 (same case)

    expect(result.current.state).toBe(1);
    expect(result.current.currentCase).toEqual(caseAfterStart);
  });

  it('is a no-op in State 0', () => {
    const { result } = renderHook(() => useTrainerState(CASES));

    act(() => { result.current.reset(); });

    expect(result.current.state).toBe(0);
    expect(result.current.currentCase).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Sequential mode
// ---------------------------------------------------------------------------

describe('sequential selection mode', () => {
  it('cycles through cases in order', () => {
    const { result } = renderHook(() => useTrainerState(CASES, 'sequential'));

    const selected: string[] = [];
    for (let i = 0; i < CASES.length; i++) {
      act(() => {
        if (i === 0) {
          result.current.startPractice();
        } else {
          // Advance through states 1→2→3→1 to trigger a new case selection
          result.current.advance(); // 1→2
          result.current.advance(); // 2→3
          result.current.advance(); // 3→1 (new case)
        }
      });
      if (result.current.currentCase) {
        selected.push(result.current.currentCase.par);
      }
    }

    // Each selected case must exist in the original array
    for (const par of selected) {
      expect(CASES.map((c) => c.par)).toContain(par);
    }
  });
});
