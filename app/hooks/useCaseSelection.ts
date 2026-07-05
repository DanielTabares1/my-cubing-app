/**
 * useCaseSelection — hook for selecting training cases from an array.
 * Applies spaced-repetition session pool filtering before shuffled selection.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TrainingCase, UseCaseSelectionReturn } from '../lib/types';
import { caseKey } from '../lib/training-cases';
import { buildSessionPool } from '../lib/session-pool';
import {
  createShuffledQueue,
  removeIndexFromQueue,
} from '../lib/shuffled-selection';

function casesPoolKey(cases: TrainingCase[]): string {
  return cases.map(caseKey).join('|');
}

/**
 * Hook that encapsulates case selection logic.
 *
 * Selection modes:
 *  - `'random'`     : Shuffled playlist over the spaced-repetition session pool —
 *                     no repeats until every pool case has been shown once, then a
 *                     new pool and shuffle start.
 *  - `'sequential'` : Returns cases in session-pool order, cycling from the start.
 */
export function useCaseSelection(cases: TrainingCase[]): UseCaseSelectionReturn {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const shuffleQueueRef = useRef<number[]>([]);
  const sessionPoolRef = useRef<TrainingCase[]>([]);
  const excludedKeysRef = useRef<Set<string>>(new Set());
  const poolKeyRef = useRef('');

  const refreshSessionPool = useCallback(() => {
    sessionPoolRef.current = buildSessionPool(cases);
    return sessionPoolRef.current;
  }, [cases]);

  const initializeShuffleQueue = useCallback(() => {
    const pool = refreshSessionPool();
    if (pool.length === 0) {
      shuffleQueueRef.current = [];
      return pool;
    }

    const excluded = excludedKeysRef.current;
    const shuffled = createShuffledQueue(pool.length).filter(
      (index) => !excluded.has(caseKey(pool[index])),
    );
    shuffleQueueRef.current = shuffled.length > 0 ? shuffled : createShuffledQueue(pool.length);
    excludedKeysRef.current = new Set();
    return pool;
  }, [refreshSessionPool]);

  useEffect(() => {
    const nextKey = casesPoolKey(cases);
    if (nextKey !== poolKeyRef.current) {
      poolKeyRef.current = nextKey;
      shuffleQueueRef.current = [];
      sessionPoolRef.current = [];
      excludedKeysRef.current = new Set();
      setCurrentIndex(0);
    }
  }, [cases]);

  const selectCase = useCallback(
    (mode: 'random' | 'sequential'): TrainingCase | null => {
      if (cases.length === 0) return null;

      if (mode === 'random') {
        if (shuffleQueueRef.current.length === 0) {
          initializeShuffleQueue();
        }

        const pool = sessionPoolRef.current;
        if (pool.length === 0) return null;

        const index = shuffleQueueRef.current.pop();
        if (index === undefined) return null;
        return pool[index] ?? null;
      }

      let pool = sessionPoolRef.current;
      if (pool.length === 0) {
        pool = refreshSessionPool();
      }
      if (pool.length === 0) return null;

      const selected = pool[currentIndex % pool.length];
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= pool.length) {
          refreshSessionPool();
          return 0;
        }
        return next;
      });
      return selected;
    },
    [cases.length, currentIndex, initializeShuffleQueue, refreshSessionPool],
  );

  const notifyCasePracticed = useCallback(
    (trainingCase: TrainingCase) => {
      const key = caseKey(trainingCase);

      if (shuffleQueueRef.current.length === 0) {
        excludedKeysRef.current.add(key);
        return;
      }

      const pool =
        sessionPoolRef.current.length > 0 ? sessionPoolRef.current : refreshSessionPool();
      const index = pool.findIndex((candidate) => caseKey(candidate) === key);
      removeIndexFromQueue(shuffleQueueRef.current, index);
    },
    [refreshSessionPool],
  );

  return {
    selectCase,
    notifyCasePracticed,
    hasMoreCases: cases.length > 0,
    currentIndex,
  };
}
