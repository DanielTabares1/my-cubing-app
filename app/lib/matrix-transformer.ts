/**
 * Matrix Transformer Module
 * Converts two 22×22 CSV matrices into a flat array of TrainingCase objects,
 * and provides a pretty-printer for debugging.
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 16.1, 16.2, 16.3
 *
 * NOTE: Full implementation lives in Task 4.1.
 * This file is created early so that csv-parser tests (Task 3.4) can import
 * prettyPrintMatrix without a missing-module error.
 */

import type { ParsedMatrix, TrainingCase } from './types';

/**
 * Converts a pair of 22×22 matrices (algorithms + memos) into a flat array
 * of TrainingCase objects.  Cells that are empty or equal to "caso no existe"
 * (case-insensitive) are skipped.
 */
export function transformMatrices(
  algoMatrix: ParsedMatrix,
  memoMatrix: ParsedMatrix
): TrainingCase[] {
  const cases: TrainingCase[] = [];

  for (let r = 0; r < algoMatrix.headers.rows.length; r++) {
    for (let c = 0; c < algoMatrix.headers.columns.length; c++) {
      const algoCell = algoMatrix.data[r]?.[c] ?? '';
      const memoCell = memoMatrix.data[r]?.[c] ?? '';

      if (algoCell === '') continue;
      if (algoCell.toLowerCase() === 'caso no existe') continue;

      const rowHeader = algoMatrix.headers.rows[r];
      const colHeader = algoMatrix.headers.columns[c];

      cases.push({
        par: rowHeader + colHeader,
        algoritmo: algoCell,
        memo: memoCell || 'Sin palabra',
      });
    }
  }

  return cases;
}

/**
 * Formats a ParsedMatrix as a human-readable aligned table string for
 * debugging purposes.
 *
 * Output format:
 *   [header]  A   B   C  ...  V
 *   A         …   …   …  ...  …
 *   B         …   …   …  ...  …
 *   …
 */
export function prettyPrintMatrix(matrix: ParsedMatrix): string {
  const { rows, columns } = matrix.headers;

  // Determine column width: max of any cell value or column header
  const colWidth = Math.max(
    ...columns.map((h) => h.length),
    ...matrix.data.flatMap((row) => row.map((cell) => cell.length)),
    1
  );

  const pad = (s: string, width: number) => s.padEnd(width, ' ');

  // Header row
  const headerRowStr =
    pad('', colWidth + 2) +
    columns.map((h) => pad(h, colWidth)).join('  ');

  // Data rows
  const dataRows = rows.map((rowHeader, r) => {
    const cells = (matrix.data[r] ?? []).map((cell) => pad(cell, colWidth));
    return pad(rowHeader, colWidth + 2) + cells.join('  ');
  });

  return [headerRowStr, ...dataRows].join('\n');
}
