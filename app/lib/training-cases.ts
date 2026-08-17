import type { PieceType, TrainingCase } from './types';
import { MAX_STREAK } from './session-pool';

export function normalizeTrainingCase(trainingCase: TrainingCase): TrainingCase {
  const streak = trainingCase.streak ?? 0;
  const isLearned = trainingCase.isLearned ?? false;
  // Migration: if a case was manually marked learned but streak didn't reach
  // the new MAX_STREAK (10), bring the streak up so the session pool treats
  // it correctly as an "old" case.
  const resolvedStreak = isLearned && streak < MAX_STREAK ? MAX_STREAK : streak;
  return {
    ...trainingCase,
    tipo: trainingCase.tipo ?? 'arista',
    isLearned,
    streak: resolvedStreak,
  };
}

export function normalizeTrainingCases(cases: TrainingCase[]): TrainingCase[] {
  return cases.map(normalizeTrainingCase);
}

export function mergeCasesByType(
  existing: TrainingCase[],
  imported: TrainingCase[],
  tipo: PieceType,
): TrainingCase[] {
  const normalizedExisting = normalizeTrainingCases(existing);
  const progressByKey = new Map(
    normalizedExisting
      .filter((trainingCase) => trainingCase.tipo === tipo)
      .map((trainingCase) => [
        caseKey(trainingCase),
        { isLearned: trainingCase.isLearned, streak: trainingCase.streak },
      ]),
  );
  const kept = normalizedExisting.filter((trainingCase) => trainingCase.tipo !== tipo);
  const merged = imported.map((trainingCase) => {
    const progress = progressByKey.get(caseKey(normalizeTrainingCase(trainingCase)));
    if (!progress) return normalizeTrainingCase(trainingCase);
    // If the existing record was learned, ensure streak reflects MAX_STREAK
    const resolvedStreak = progress.isLearned && (progress.streak ?? 0) < MAX_STREAK
      ? MAX_STREAK
      : (progress.streak ?? 0);
    return normalizeTrainingCase({
      ...trainingCase,
      isLearned: progress.isLearned,
      streak: resolvedStreak,
    });
  });
  return [...kept, ...merged];
}

export function countCasesByType(cases: TrainingCase[]) {
  const normalized = normalizeTrainingCases(cases);
  const aristas = normalized.filter((trainingCase) => trainingCase.tipo === 'arista').length;
  const esquinas = normalized.filter((trainingCase) => trainingCase.tipo === 'esquina').length;

  return { aristas, esquinas, total: normalized.length };
}

export function filterCasesByPiece(cases: TrainingCase[], piece: PieceType): TrainingCase[] {
  return normalizeTrainingCases(cases).filter((trainingCase) => trainingCase.tipo === piece);
}

export function caseKey(trainingCase: TrainingCase): string {
  const tipo = trainingCase.tipo ?? 'arista';
  return `${tipo}:${trainingCase.par}`;
}
