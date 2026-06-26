/**
 * useTrainerState — state machine hook for the 3-style BLD edge trainer.
 *
 * State machine:
 *   0 (Idle)       → startPractice() → 1 (Recognition)
 *   1 (Recognition) → advance()      → 2 (Memorization)
 *   2 (Memorization)→ advance()      → 3 (Review)
 *   3 (Review)      → advance()      → (select new case) → 1 (Recognition)
 *   1 | 2 | 3       → reset()        → 1 (same case)
 *
 * Guard: advance() is a no-op when state === 0 and cases.length === 0.
 *
 * Requirements: 5.1, 5.2, 5.4, 5.7, 5.10, 5.12, 6.2, 8.4
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { PieceType, TrainingCase, TrainerState, UseTrainerStateReturn } from '../lib/types';
import { useCaseSelection } from './useCaseSelection';

/**
 * Hook that manages the four-state flashcard flow.
 *
 * @param cases - The full array of available training cases.
 *                Pass an empty array to start in the guarded idle state.
 * @param selectionMode - Whether to pick cases randomly or sequentially.
 *                        Defaults to `'random'`.
 */
export function useTrainerState(
  cases: TrainingCase[],
  selectionMode: 'random' | 'sequential' = 'random',
  algorithmStep = true,
  practicePiece: PieceType = 'arista',
): UseTrainerStateReturn {
  const [state, setState] = useState<TrainerState>(0);
  const [currentCase, setCurrentCase] = useState<TrainingCase | null>(null);

  const { selectCase, notifyCasePracticed } = useCaseSelection(cases);
  const sessionKeyRef = useRef(`${practicePiece}:${cases.length}`);

  useEffect(() => {
    const nextSessionKey = `${practicePiece}:${cases.length}`;
    if (sessionKeyRef.current === nextSessionKey) return;

    setState(0);
    setCurrentCase(null);
    sessionKeyRef.current = nextSessionKey;
  }, [cases.length, practicePiece]);

  // -------------------------------------------------------------------------
  // startPractice: 0 → 1 (select first case)
  // -------------------------------------------------------------------------
  const startPractice = useCallback(() => {
    if (cases.length === 0) return; // Guard: nothing to practice

    const selected = selectCase(selectionMode);
    setCurrentCase(selected);
    setState(1);
  }, [cases.length, selectCase, selectionMode]);

  // -------------------------------------------------------------------------
  // advance: 1→2, 2→3, 3→(new case)→1
  // No-op when state === 0 and there are no cases.
  // -------------------------------------------------------------------------
  const advance = useCallback(() => {
    if (state === 0) {
      // Guard: do not allow advancing from idle with no cases loaded.
      if (cases.length === 0) return;
      // If someone calls advance() from state 0 with cases available,
      // treat it like startPractice.
      const selected = selectCase(selectionMode);
      setCurrentCase(selected);
      setState(1);
      return;
    }

    if (state === 1) {
      // Progress to the next state in the linear chain.
      setState((prev) => (prev + 1) as TrainerState);
      return;
    }

    if (state === 2) {
      if (algorithmStep) {
        setState(3);
        return;
      }

      const newCase = selectCase(selectionMode);
      setCurrentCase(newCase);
      setState(1);
      return;
    }

    if (state === 3) {
      // Select a new case and go back to State 1 (Requirement 5.12).
      const newCase = selectCase(selectionMode);
      setCurrentCase(newCase);
      setState(1);
    }
  }, [state, cases.length, selectCase, selectionMode, algorithmStep]);

  // -------------------------------------------------------------------------
  // reset: any active state → 1 (same case, no new selection)
  // -------------------------------------------------------------------------
  const reset = useCallback(() => {
    if (state === 0) return; // Nothing to reset in idle state
    setState(1);
  }, [state]);

  const practiceCase = useCallback((trainingCase: TrainingCase) => {
    notifyCasePracticed(trainingCase);
    setCurrentCase(trainingCase);
    setState(1);
  }, [notifyCasePracticed]);

  return { state, currentCase, advance, reset, startPractice, practiceCase };
}
