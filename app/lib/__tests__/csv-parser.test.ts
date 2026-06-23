import { describe, expect, test as vitestTest } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import Papa from 'papaparse';

import { parseCSVFile, validateMatrixStructure } from '../csv-parser';
import { prettyPrintMatrix } from '../matrix-transformer';
import type { ParsedMatrix } from '../types';

const HEADER_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const matrixSizeArb = fc.constantFrom(21, 22);

const validHeadersArb = matrixSizeArb.chain((size) =>
  fc.uniqueArray(fc.constantFrom(...HEADER_POOL), {
    minLength: size,
    maxLength: size,
  }),
);

const validMatrixArb: fc.Arbitrary<ParsedMatrix> = validHeadersArb.chain((headers) => {
  const size = headers.length;
  const cellValueArb = fc.string({ maxLength: 20 });
  const dataGridArb = fc.array(
    fc.array(cellValueArb, { minLength: size, maxLength: size }),
    { minLength: size, maxLength: size },
  );

  return dataGridArb.map((data) => ({
    headers: {
      rows: headers,
      columns: headers,
    },
    data,
  }));
});

describe('Property 1: Matrix Structure Validation', () => {
  test.prop([validMatrixArb], { numRuns: 100 })(
    'validateMatrixStructure returns isValid: true for any well-formed personal letter scheme',
    (matrix) => {
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    },
  );
});

describe('Property 2: Matrix Validation Rejects Malformed Input', () => {
  test.prop(
    [
      fc
        .tuple(fc.integer({ min: 0, max: 20 }), fc.integer({ min: 21, max: 22 }))
        .filter(([rowCount, colCount]) => rowCount !== colCount || (rowCount !== 21 && rowCount !== 22)),
    ],
    { numRuns: 100 },
  )(
    'rejects matrices with unsupported row header counts',
    ([rowCount, colCount]) => {
      const headers = HEADER_POOL.slice(0, colCount);
      const rows = HEADER_POOL.slice(0, rowCount);
      const matrix: ParsedMatrix = {
        headers: { rows, columns: headers },
        data: Array.from({ length: rows.length }, () => Array(colCount).fill('')),
      };
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    },
  );

  test.prop(
    [
      fc
        .tuple(fc.integer({ min: 0, max: 20 }), fc.integer({ min: 21, max: 22 }))
        .filter(([colCount, rowCount]) => colCount !== rowCount || (colCount !== 21 && colCount !== 22)),
    ],
    { numRuns: 100 },
  )(
    'rejects matrices with unsupported column header counts',
    ([colCount, rowCount]) => {
      const rows = HEADER_POOL.slice(0, rowCount);
      const columns = HEADER_POOL.slice(0, colCount);
      const matrix: ParsedMatrix = {
        headers: { rows, columns },
        data: Array.from({ length: rows.length }, () => Array(columns.length).fill('')),
      };
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    },
  );

  test.prop(
    [
      fc.integer({ min: 21, max: 22 }),
      fc.integer({ min: 0, max: 20 }),
      fc.constantFrom('', 'AA', '1', '-'),
    ],
    { numRuns: 100 },
  )(
    'rejects matrices with invalid row headers',
    (size, replaceIndex, invalidHeader) => {
      const headers = HEADER_POOL.slice(0, size);
      const rows = [...headers];
      rows[replaceIndex] = invalidHeader;
      const matrix: ParsedMatrix = {
        headers: { rows, columns: headers },
        data: Array.from({ length: size }, () => Array(size).fill('')),
      };
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    },
  );

  test.prop(
    [fc.integer({ min: 21, max: 22 }), fc.integer({ min: 1, max: 20 })],
    { numRuns: 100 },
  )(
    'rejects matrices with duplicate row headers',
    (size, replaceIndex) => {
      const headers = HEADER_POOL.slice(0, size);
      const rows = [...headers];
      rows[replaceIndex] = rows[0];
      const matrix: ParsedMatrix = {
        headers: { rows, columns: headers },
        data: Array.from({ length: size }, () => Array(size).fill('')),
      };
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    },
  );

  test.prop(
    [fc.integer({ min: 21, max: 22 }), fc.integer({ min: 0, max: 19 })],
    { numRuns: 100 },
  )(
    'rejects matrices whose column headers do not match row headers',
    (size, swapIndex) => {
      const headers = HEADER_POOL.slice(0, size);
      const columns = [...headers];
      [columns[swapIndex], columns[swapIndex + 1]] = [
        columns[swapIndex + 1],
        columns[swapIndex],
      ];
      const matrix: ParsedMatrix = {
        headers: { rows: headers, columns },
        data: Array.from({ length: size }, () => Array(size).fill('')),
      };
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    },
  );
});

describe('Strict CSV grid shape', () => {
  vitestTest('accepts a square matrix with no trailing rows or columns', async () => {
    const headers = HEADER_POOL.slice(0, 22);
    const csv = Papa.unparse([
      ['', ...headers],
      ...headers.map((rowHeader) => [rowHeader, ...Array(22).fill('algo')]),
    ]);

    const file = new File([csv], 'aristas.csv', { type: 'text/csv' });
    const matrix = await parseCSVFile(file);
    const validation = validateMatrixStructure(matrix);

    expect(validation.isValid).toBe(true);
    expect(matrix.headers.rows).toHaveLength(22);
    expect(matrix.headers.columns).toHaveLength(22);
    expect(matrix.data).toHaveLength(22);
  });

  vitestTest('rejects blank or metadata rows after the data grid', async () => {
    const headers = HEADER_POOL.slice(0, 22);
    const csv = Papa.unparse([
      ['', ...headers],
      ...headers.map((rowHeader) => [rowHeader, ...Array(22).fill('algo')]),
      ['', ...Array(22).fill('')],
      ['', 'Conteo:', '40', ...Array(19).fill('')],
    ]);

    const file = new File([csv], 'aristas.csv', { type: 'text/csv' });

    await expect(parseCSVFile(file)).rejects.toThrow(/exactamente 23 filas/i);
  });

  vitestTest('rejects matrices with too few data rows', async () => {
    const headers = HEADER_POOL.slice(0, 22);
    const csv = Papa.unparse([
      ['', ...headers],
      ...headers.slice(0, 10).map((rowHeader) => [rowHeader, ...Array(22).fill('algo')]),
    ]);

    const file = new File([csv], 'incomplete.csv', { type: 'text/csv' });

    await expect(parseCSVFile(file)).rejects.toThrow(/exactamente 23 filas/i);
  });
});

describe('Property 8: Pretty Printer Round-Trip Preservation', () => {
  test.prop([validMatrixArb], { numRuns: 100 })(
    'pretty printer output contains all row headers, column headers, and data values',
    (matrix) => {
      const output = prettyPrintMatrix(matrix);

      for (const rowHeader of matrix.headers.rows) {
        expect(output).toContain(rowHeader);
      }

      for (const colHeader of matrix.headers.columns) {
        expect(output).toContain(colHeader);
      }

      for (const row of matrix.data) {
        for (const cell of row) {
          if (cell !== '') {
            expect(output).toContain(cell);
          }
        }
      }
    },
  );
});
