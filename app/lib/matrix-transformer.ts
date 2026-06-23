/**
 * Matrix Transformer Module
 * Converts algorithm and memo CSV matrices into TrainingCase objects.
 */

import type { ParsedMatrix, PieceType, TrainingCase, ValidationResult } from './types';
import { splitAlgorithmVariants } from './algorithm-variants';
import { isNonExistentCaseCell } from './case-filter';

function getMemoCell(memoMatrix: ParsedMatrix, rowHeader: string, colHeader: string): string {
  const rowIndex = memoMatrix.headers.rows.indexOf(rowHeader);
  const colIndex = memoMatrix.headers.columns.indexOf(colHeader);

  if (rowIndex === -1 || colIndex === -1) return '';

  return memoMatrix.data[rowIndex]?.[colIndex] ?? '';
}

export function validateMemoCoversAlgo(
  algoMatrix: ParsedMatrix,
  memoMatrix: ParsedMatrix,
): ValidationResult {
  const errors: string[] = [];

  for (const header of algoMatrix.headers.rows) {
    if (!memoMatrix.headers.rows.includes(header)) {
      errors.push(
        `La matriz de memos no incluye la letra de fila '${header}' usada en algoritmos.`
      );
    }
  }

  for (const header of algoMatrix.headers.columns) {
    if (!memoMatrix.headers.columns.includes(header)) {
      errors.push(
        `La matriz de memos no incluye la letra de columna '${header}' usada en algoritmos.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Converts an algorithm matrix and a shared memo matrix into training cases.
 * Memo lookup uses header labels so a larger memo matrix can serve smaller algo matrices.
 */
export function transformMatrices(
  algoMatrix: ParsedMatrix,
  memoMatrix: ParsedMatrix,
  pieceType: PieceType,
): TrainingCase[] {
  const coverage = validateMemoCoversAlgo(algoMatrix, memoMatrix);
  if (!coverage.isValid) {
    throw new Error(coverage.errors.join(' '));
  }

  const cases: TrainingCase[] = [];

  for (let r = 0; r < algoMatrix.headers.rows.length; r++) {
    for (let c = 0; c < algoMatrix.headers.columns.length; c++) {
      const algoCell = algoMatrix.data[r]?.[c] ?? '';

      if (algoCell === '') continue;
      if (isNonExistentCaseCell(algoCell)) continue;

      const rowHeader = algoMatrix.headers.rows[r];
      const colHeader = algoMatrix.headers.columns[c];
      const memoCell = getMemoCell(memoMatrix, rowHeader, colHeader);

      cases.push({
        tipo: pieceType,
        par: rowHeader + colHeader,
        algoritmo: algoCell,
        algoritmos: splitAlgorithmVariants(algoCell),
        memo: memoCell || 'Sin palabra',
      });
    }
  }

  return cases;
}

/**
 * Formats a ParsedMatrix as a human-readable aligned table string for
 * debugging purposes.
 */
export function prettyPrintMatrix(matrix: ParsedMatrix): string {
  const { rows, columns } = matrix.headers;

  const colWidth = Math.max(
    ...columns.map((h) => h.length),
    ...matrix.data.flatMap((row) => row.map((cell) => cell.length)),
    1
  );

  const pad = (s: string, width: number) => s.padEnd(width, ' ');

  const headerRowStr =
    pad('', colWidth + 2) +
    columns.map((h) => pad(h, colWidth)).join('  ');

  const dataRows = rows.map((rowHeader, r) => {
    const cells = (matrix.data[r] ?? []).map((cell) => pad(cell, colWidth));
    return pad(rowHeader, colWidth + 2) + cells.join('  ');
  });

  return [headerRowStr, ...dataRows].join('\n');
}
