/**
 * useCaseSelection — hook for selecting training cases from an array.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TrainingCase, UseCaseSelectionReturn } from '../lib/types';
import { caseKey } from '../lib/training-cases';
import { popShuffledIndex, removeIndexFromQueue } from '../lib/shuffled-selection';

function casesPoolKey(cases: TrainingCase[]): string {
  return cases.map(caseKey).join('|');
}

/**
 * Hook that encapsulates case selection logic.
 *
 * Selection modes:
 *  - `'random'`     : Shuffled playlist — no repeats until every case has been
 *                     shown once, then a new shuffle starts.
 *  - `'sequential'` : Returns cases in array order, cycling from the start.
 */
export function useCaseSelection(cases: TrainingCase[]): UseCaseSelectionReturn {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const shuffleQueueRef = useRef<number[]>([]);
  const poolKeyRef = useRef('');

  useEffect(() => {
    const nextKey = casesPoolKey(cases);
    if (nextKey !== poolKeyRef.current) {
      poolKeyRef.current = nextKey;
      shuffleQueueRef.current = [];
      setCurrentIndex(0);
    }
  }, [cases]);

  const selectCase = useCallback(
    (mode: 'random' | 'sequential'): TrainingCase | null => {
      if (cases.length === 0) return null;

      if (mode === 'random') {
        const index = popShuffledIndex(shuffleQueueRef.current, cases.length);
        if (index === null) return null;
        return cases[index];
      }

      const selected = cases[currentIndex % cases.length];
      setCurrentIndex((prev) => (prev + 1) % cases.length);
      return selected;
    },
    [cases, currentIndex],
  );

  const notifyCasePracticed = useCallback(
    (trainingCase: TrainingCase) => {
      const index = cases.findIndex((candidate) => caseKey(candidate) === caseKey(trainingCase));
      removeIndexFromQueue(shuffleQueueRef.current, index);
    },
    [cases],
  );

  return {
    selectCase,
    notifyCasePracticed,
    hasMoreCases: cases.length > 0,
    currentIndex,
  };
}
