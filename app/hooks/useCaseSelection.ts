/**
 * useCaseSelection — hook for selecting training cases from an array.
 * Supports both random and sequential (cyclic) selection modes.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

'use client';

import { useState, useCallback } from 'react';
import type { TrainingCase, UseCaseSelectionReturn } from '../lib/types';

/**
 * Hook that encapsulates case selection logic.
 *
 * @param cases - The full array of available training cases.
 *
 * Selection modes:
 *  - `'random'`     : Picks a uniformly random index on every call.
 *                     Does NOT advance `currentIndex`.
 *  - `'sequential'` : Returns `cases[currentIndex]` then advances the index
 *                     cyclically with `% cases.length`.
 *
 * Returns:
 *  - `selectCase(mode)` — selects and returns the next case, or `null` when
 *    the array is empty.
 *  - `hasMoreCases`     — true when at least one case is available.
 *  - `currentIndex`     — the current sequential position.
 */
export function useCaseSelection(cases: TrainingCase[]): UseCaseSelectionReturn {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const selectCase = useCallback(
    (mode: 'random' | 'sequential'): TrainingCase | null => {
      if (cases.length === 0) return null;

      if (mode === 'random') {
        const randomIndex = Math.floor(Math.random() * cases.length);
        return cases[randomIndex];
      }

      // Sequential: return the case at the current index, then advance cyclically.
      const selected = cases[currentIndex % cases.length];
      setCurrentIndex((prev) => (prev + 1) % cases.length);
      return selected;
    },
    [cases, currentIndex],
  );

  return {
    selectCase,
    hasMoreCases: cases.length > 0,
    currentIndex,
  };
}
