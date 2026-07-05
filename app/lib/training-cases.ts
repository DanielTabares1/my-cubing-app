import type { PieceType, TrainingCase } from './types';

export function normalizeTrainingCase(trainingCase: TrainingCase): TrainingCase {
  return {
    ...trainingCase,
    tipo: trainingCase.tipo ?? 'arista',
    isLearned: trainingCase.isLearned ?? false,
    streak: trainingCase.streak ?? 0,
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
    return normalizeTrainingCase({
      ...trainingCase,
      isLearned: progress.isLearned,
      streak: progress.streak,
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
