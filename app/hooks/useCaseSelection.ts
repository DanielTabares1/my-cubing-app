'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { TrainingCase, UseCaseSelectionReturn } from '../lib/types';
import { caseKey } from '../lib/training-cases';
import { buildSessionPool } from '../lib/session-pool';
import { getCatalogStats, getRoundStats, type RoundStats } from '../lib/round-stats';
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
export function useCaseSelection(
  cases: TrainingCase[],
  selectionMode: 'random' | 'sequential' = 'random',
): UseCaseSelectionReturn {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [roundStats, setRoundStats] = useState<RoundStats | null>(null);
  const shuffleQueueRef = useRef<number[]>([]);
  const sessionPoolRef = useRef<TrainingCase[]>([]);
  const excludedKeysRef = useRef<Set<string>>(new Set());
  const poolKeyRef = useRef('');
  const roundSizeRef = useRef(0);
  const completedInRoundRef = useRef(0);

  const catalogStats = useMemo(() => getCatalogStats(cases), [cases]);

  const syncRoundStats = useCallback(() => {
    const nextStats = getRoundStats(
      sessionPoolRef.current,
      roundSizeRef.current,
      completedInRoundRef.current,
    );
    setRoundStats(nextStats);
  }, []);

  const beginRound = useCallback(
    (pool: TrainingCase[]) => {
      sessionPoolRef.current = pool;
      roundSizeRef.current = pool.length;
      completedInRoundRef.current = 0;
      syncRoundStats();
    },
    [syncRoundStats],
  );

  const refreshSessionPool = useCallback(() => {
    const pool = buildSessionPool(cases);
    return pool;
  }, [cases]);

  const initializeShuffleQueue = useCallback(() => {
    const pool = refreshSessionPool();
    if (pool.length === 0) {
      shuffleQueueRef.current = [];
      roundSizeRef.current = 0;
      completedInRoundRef.current = 0;
      sessionPoolRef.current = [];
      setRoundStats(null);
      return pool;
    }

    beginRound(pool);

    const excluded = excludedKeysRef.current;
    const shuffled = createShuffledQueue(pool.length).filter(
      (index) => !excluded.has(caseKey(pool[index])),
    );
    shuffleQueueRef.current = shuffled.length > 0 ? shuffled : createShuffledQueue(pool.length);
    excludedKeysRef.current = new Set();
    return pool;
  }, [beginRound, refreshSessionPool]);

  const markCaseCompleted = useCallback(() => {
    completedInRoundRef.current = Math.min(
      roundSizeRef.current,
      completedInRoundRef.current + 1,
    );
    syncRoundStats();
  }, [syncRoundStats]);

  useEffect(() => {
    const nextKey = casesPoolKey(cases);
    if (nextKey !== poolKeyRef.current) {
      poolKeyRef.current = nextKey;
      shuffleQueueRef.current = [];
      sessionPoolRef.current = [];
      excludedKeysRef.current = new Set();
      roundSizeRef.current = 0;
      completedInRoundRef.current = 0;
      setCurrentIndex(0);
      setRoundStats(null);
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

        completedInRoundRef.current = roundSizeRef.current - shuffleQueueRef.current.length;
        syncRoundStats();
        return pool[index] ?? null;
      }

      let pool = sessionPoolRef.current;
      if (pool.length === 0) {
        pool = refreshSessionPool();
        if (pool.length === 0) return null;
        beginRound(pool);
      }

      const selected = pool[currentIndex % pool.length];
      const nextIndex = currentIndex + 1;

      if (nextIndex >= pool.length) {
        completedInRoundRef.current = pool.length;
        syncRoundStats();

        const nextPool = refreshSessionPool();
        if (nextPool.length === 0) {
          setCurrentIndex(0);
          return selected;
        }

        beginRound(nextPool);
        setCurrentIndex(0);
        return selected;
      }

      completedInRoundRef.current = nextIndex;
      syncRoundStats();
      setCurrentIndex(nextIndex);
      return selected;
    },
    [
      cases.length,
      currentIndex,
      beginRound,
      initializeShuffleQueue,
      refreshSessionPool,
      syncRoundStats,
    ],
  );

  const notifyCasePracticed = useCallback(
    (trainingCase: TrainingCase) => {
      const key = caseKey(trainingCase);

      if (selectionMode === 'random') {
        if (shuffleQueueRef.current.length === 0) {
          excludedKeysRef.current.add(key);
          return;
        }

        const pool =
          sessionPoolRef.current.length > 0 ? sessionPoolRef.current : refreshSessionPool();
        const index = pool.findIndex((candidate) => caseKey(candidate) === key);
        removeIndexFromQueue(shuffleQueueRef.current, index);
        completedInRoundRef.current = roundSizeRef.current - shuffleQueueRef.current.length;
        syncRoundStats();
        return;
      }

      if (roundSizeRef.current > 0) {
        markCaseCompleted();
      }
    },
    [markCaseCompleted, refreshSessionPool, selectionMode, syncRoundStats],
  );

  return {
    selectCase,
    notifyCasePracticed,
    hasMoreCases: cases.length > 0,
    currentIndex,
    catalogStats,
    roundStats,
  };
}
