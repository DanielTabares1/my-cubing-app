import type { PieceType, TrainingCase } from './types';

export function normalizeTrainingCase(trainingCase: TrainingCase): TrainingCase {
  return {
    ...trainingCase,
    tipo: trainingCase.tipo ?? 'arista',
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
  const kept = normalizeTrainingCases(existing).filter((trainingCase) => trainingCase.tipo !== tipo);
  return [...kept, ...imported];
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
