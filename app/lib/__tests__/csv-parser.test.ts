/**
 * CSV Parser property-based tests.
 * Feature: 3style-bld-edge-trainer
 *
 * Tests:
 *   Property 1 — Matrix Structure Validation
 *   Property 2 — Matrix Validation Rejects Malformed Input
 *   Property 8 — Pretty Printer Round-Trip Preservation
 */

import { describe, expect } from 'vitest';
import { fc, test } from '@fast-check/vitest';

import { validateMatrixStructure } from '../csv-parser';
import { prettyPrintMatrix } from '../matrix-transformer';
import type { ParsedMatrix } from '../types';

// ---------------------------------------------------------------------------
// Shared helpers / generators
// ---------------------------------------------------------------------------

const VALID_HEADERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'] as const;

/** Arbitrary that always produces the full 22-letter A–V array. */
const validHeadersArb = fc.constant([...VALID_HEADERS]);

/** Arbitrary that produces a single cell value (any trimmed string). */
const cellValueArb = fc.string({ maxLength: 20 });

/** Arbitrary that produces a 22×22 data grid of strings. */
const dataGridArb = fc.array(
  fc.array(cellValueArb, { minLength: 22, maxLength: 22 }),
  { minLength: 22, maxLength: 22 }
);

/** Arbitrary that produces a fully valid ParsedMatrix. */
const validMatrixArb: fc.Arbitrary<ParsedMatrix> = fc.record({
  headers: fc.record({
    rows: validHeadersArb,
    columns: validHeadersArb,
  }),
  data: dataGridArb,
});

// ---------------------------------------------------------------------------
// Property 1 — Matrix Structure Validation
// ---------------------------------------------------------------------------

// Feature: 3style-bld-edge-trainer, Property 1: Matrix Structure Validation

describe('Property 1: Matrix Structure Validation', () => {
  /**
   * For any valid 22×22 matrix with correct A–V headers, validateMatrixStructure
   * must return isValid: true with no errors.
   *
   * **Validates: Requirements 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**
   */
  test.prop([validMatrixArb], { numRuns: 100 })(
    'validateMatrixStructure returns isValid: true for any well-formed matrix',
    (matrix) => {
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  );
});

// ---------------------------------------------------------------------------
// Property 2 — Matrix Validation Rejects Malformed Input
// ---------------------------------------------------------------------------

// Feature: 3style-bld-edge-trainer, Property 2: Matrix Validation Rejects Malformed Input

describe('Property 2: Matrix Validation Rejects Malformed Input', () => {
  /**
   * A matrix with fewer than 22 row headers must be rejected.
   *
   * **Validates: Requirements 1.4, 2.4**
   */
  test.prop(
    [
      fc.array(fc.constantFrom(...VALID_HEADERS), { minLength: 0, maxLength: 21 }),
      dataGridArb,
    ],
    { numRuns: 100 }
  )(
    'rejects matrices with fewer than 22 row headers',
    (rows, data) => {
      const matrix: ParsedMatrix = {
        headers: { rows, columns: [...VALID_HEADERS] },
        data,
      };
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  );

  /**
   * A matrix with fewer than 22 column headers must be rejected.
   *
   * **Validates: Requirements 1.4, 2.4**
   */
  test.prop(
    [
      fc.array(fc.constantFrom(...VALID_HEADERS), { minLength: 0, maxLength: 21 }),
      dataGridArb,
    ],
    { numRuns: 100 }
  )(
    'rejects matrices with fewer than 22 column headers',
    (columns, data) => {
      const matrix: ParsedMatrix = {
        headers: { rows: [...VALID_HEADERS], columns },
        data,
      };
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  );

  /**
   * A matrix with more than 22 row headers must be rejected.
   *
   * **Validates: Requirements 1.4, 2.4**
   */
  test.prop(
    [
      fc.array(fc.constantFrom(...VALID_HEADERS), { minLength: 23, maxLength: 30 }),
      dataGridArb,
    ],
    { numRuns: 100 }
  )(
    'rejects matrices with more than 22 row headers',
    (rows, data) => {
      const matrix: ParsedMatrix = {
        headers: { rows, columns: [...VALID_HEADERS] },
        data,
      };
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  );

  /**
   * A matrix where at least one header is not a letter A–V must be rejected.
   * We generate a 22-element array, replace one element with an invalid letter.
   *
   * **Validates: Requirements 1.4, 2.4**
   */
  test.prop(
    [
      fc.integer({ min: 0, max: 21 }),
      // Use a letter outside A–V range
      fc.string({ minLength: 1, maxLength: 3 }).filter(
        (s) => !VALID_HEADERS.includes(s as typeof VALID_HEADERS[number])
      ),
    ],
    { numRuns: 100 }
  )(
    'rejects matrices with invalid header letters in row headers',
    (replaceIndex, invalidLetter) => {
      const rows = [...VALID_HEADERS] as string[];
      rows[replaceIndex] = invalidLetter;
      const matrix: ParsedMatrix = {
        headers: { rows, columns: [...VALID_HEADERS] },
        data: Array.from({ length: 22 }, () => Array(22).fill('')),
      };
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  );

  /**
   * A matrix where at least one column header is not a letter A–V must be rejected.
   *
   * **Validates: Requirements 1.4, 2.4**
   */
  test.prop(
    [
      fc.integer({ min: 0, max: 21 }),
      fc.string({ minLength: 1, maxLength: 3 }).filter(
        (s) => !VALID_HEADERS.includes(s as typeof VALID_HEADERS[number])
      ),
    ],
    { numRuns: 100 }
  )(
    'rejects matrices with invalid header letters in column headers',
    (replaceIndex, invalidLetter) => {
      const columns = [...VALID_HEADERS] as string[];
      columns[replaceIndex] = invalidLetter;
      const matrix: ParsedMatrix = {
        headers: { rows: [...VALID_HEADERS], columns },
        data: Array.from({ length: 22 }, () => Array(22).fill('')),
      };
      const result = validateMatrixStructure(matrix);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  );
});

// ---------------------------------------------------------------------------
// Property 8 — Pretty Printer Round-Trip Preservation
// ---------------------------------------------------------------------------

// Feature: 3style-bld-edge-trainer, Property 8: Pretty Printer Round-Trip Preservation

describe('Property 8: Pretty Printer Round-Trip Preservation', () => {
  /**
   * For any valid ParsedMatrix, prettyPrintMatrix must produce a string that
   * contains all row headers, all column headers, and all non-empty data values.
   *
   * **Validates: Requirements 16.2, 16.3**
   */
  test.prop([validMatrixArb], { numRuns: 100 })(
    'pretty printer output contains all row headers, column headers, and data values',
    (matrix) => {
      const output = prettyPrintMatrix(matrix);

      // All row headers must appear in the output
      for (const rowHeader of matrix.headers.rows) {
        expect(output).toContain(rowHeader);
      }

      // All column headers must appear in the output
      for (const colHeader of matrix.headers.columns) {
        expect(output).toContain(colHeader);
      }

      // All non-empty data values must appear in the output
      for (const row of matrix.data) {
        for (const cell of row) {
          if (cell !== '') {
            expect(output).toContain(cell);
          }
        }
      }
    }
  );
});
