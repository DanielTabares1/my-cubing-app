/**
 * Matrix Transformer property-based tests.
 * Feature: 3style-bld-edge-trainer
 *
 * Tests:
 *   Property 3 — Training Case Transformation Correctness
 *   Property 4 — Training Case Filtering
 */

import { describe, expect } from 'vitest';
import { fc, test } from '@fast-check/vitest';

import { transformMatrices } from '../matrix-transformer';
import type { ParsedMatrix } from '../types';

// ---------------------------------------------------------------------------
// Shared helpers / generators
// ---------------------------------------------------------------------------

const VALID_HEADERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
  'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
] as const;

const validHeadersArb = fc.constant([...VALID_HEADERS]);

/**
 * Arbitrary for a non-empty, non-filtered algorithm cell value.
 * Excludes empty strings and "caso no existe" (any casing) so every
 * generated cell must appear in the output.
 */
const validAlgoCellArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.toLowerCase() !== 'caso no existe');

/**
 * Arbitrary for a memo cell value (any string, including empty).
 */
const memoCellArb = fc.string({ maxLength: 20 });

/**
 * Build a ParsedMatrix from a flat array of cell values.
 * All 22×22 cells are provided; headers are always A–V.
 */
function buildMatrix(cells: string[][]): ParsedMatrix {
  return {
    headers: {
      rows: [...VALID_HEADERS],
      columns: [...VALID_HEADERS],
    },
    data: cells,
  };
}

/**
 * Arbitrary that generates a 22×22 matrix where every cell is a
 * valid (non-empty, non-"caso no existe") algorithm string.
 */
const fullAlgoMatrixArb: fc.Arbitrary<ParsedMatrix> = fc
  .array(fc.array(validAlgoCellArb, { minLength: 22, maxLength: 22 }), {
    minLength: 22,
    maxLength: 22,
  })
  .map(buildMatrix);

/**
 * Arbitrary that generates a 22×22 memo matrix (any strings).
 */
const fullMemoMatrixArb: fc.Arbitrary<ParsedMatrix> = fc
  .array(fc.array(memoCellArb, { minLength: 22, maxLength: 22 }), {
    minLength: 22,
    maxLength: 22,
  })
  .map(buildMatrix);

// ---------------------------------------------------------------------------
// Property 3 — Training Case Transformation Correctness
// ---------------------------------------------------------------------------

// Feature: 3style-bld-edge-trainer, Property 3: Training Case Transformation Correctness

describe('Property 3: Training Case Transformation Correctness', () => {
  /**
   * For any valid matrix pair where every algo cell is non-empty and not
   * "caso no existe", every output TrainingCase must have:
   *   - par  === rowHeader + colHeader
   *   - algoritmo === the algo matrix cell value
   *   - memo === the memo cell value (or "Sin palabra" when memo is empty)
   *
   * **Validates: Requirements 3.1, 3.4, 3.5, 3.6, 3.7**
   */
  test.prop([fullAlgoMatrixArb, fullMemoMatrixArb], { numRuns: 100 })(
    'every output TrainingCase has correct par, algoritmo, and memo fields',
    (algoMatrix, memoMatrix) => {
      const cases = transformMatrices(algoMatrix, memoMatrix);

      // With all valid cells filled in, we must get exactly 22*22 = 484 cases
      expect(cases).toHaveLength(22 * 22);

      cases.forEach((tc, index) => {
        const r = Math.floor(index / 22);
        const c = index % 22;

        const expectedPar = VALID_HEADERS[r] + VALID_HEADERS[c];
        const expectedAlgo = algoMatrix.data[r][c];
        const rawMemo = memoMatrix.data[r][c];
        const expectedMemo = rawMemo === '' ? 'Sin palabra' : rawMemo;

        // Requirement 3.4: par = rowHeader + colHeader
        expect(tc.par).toBe(expectedPar);

        // Requirement 3.5: algoritmo = algo matrix cell value
        expect(tc.algoritmo).toBe(expectedAlgo);

        // Requirements 3.6 + 3.7: memo = memo cell or "Sin palabra"
        expect(tc.memo).toBe(expectedMemo);
      });
    }
  );
});

// ---------------------------------------------------------------------------
// Property 4 — Training Case Filtering
// ---------------------------------------------------------------------------

// Feature: 3style-bld-edge-trainer, Property 4: Training Case Filtering

describe('Property 4: Training Case Filtering', () => {
  /**
   * "caso no existe" variations used to generate filtered cells.
   */
  const CASO_NO_EXISTE_VARIANTS = [
    'caso no existe',
    'Caso No Existe',
    'CASO NO EXISTE',
    'Caso no existe',
    'cAsO nO eXiStE',
  ];

  /**
   * Arbitrary that generates a cell value that should be filtered out:
   * either an empty string or a "caso no existe" variant (any casing).
   */
  const filteredCellArb = fc.oneof(
    fc.constant(''),
    fc.constantFrom(...CASO_NO_EXISTE_VARIANTS)
  );

  /**
   * Arbitrary for a single cell: either filtered or valid.
   */
  const mixedCellArb = fc.oneof(filteredCellArb, validAlgoCellArb);

  /**
   * Arbitrary that generates a 22×22 algo matrix with a mix of valid,
   * empty, and "caso no existe" cells.
   */
  const mixedAlgoMatrixArb: fc.Arbitrary<ParsedMatrix> = fc
    .array(fc.array(mixedCellArb, { minLength: 22, maxLength: 22 }), {
      minLength: 22,
      maxLength: 22,
    })
    .map(buildMatrix);

  /**
   * For any algo matrix containing empty or "caso no existe" cells, the
   * output TrainingCase array must contain no case with an empty algoritmo
   * and no case whose algoritmo equals "caso no existe" (case-insensitive).
   *
   * **Validates: Requirements 3.2, 3.3**
   */
  test.prop([mixedAlgoMatrixArb, fullMemoMatrixArb], { numRuns: 100 })(
    'output contains no empty algoritmo and no "caso no existe" algoritmo',
    (algoMatrix, memoMatrix) => {
      const cases = transformMatrices(algoMatrix, memoMatrix);

      for (const tc of cases) {
        // Requirement 3.2: no empty algoritmo
        expect(tc.algoritmo).not.toBe('');

        // Requirement 3.3: no "caso no existe" (case-insensitive)
        expect(tc.algoritmo.toLowerCase()).not.toBe('caso no existe');
      }
    }
  );

  /**
   * All filtered cells (empty or "caso no existe") produce no output cases,
   * i.e. when the entire algo matrix consists of filtered cells the result
   * must be an empty array.
   *
   * **Validates: Requirements 3.2, 3.3**
   */
  test.prop(
    [
      fc
        .array(fc.array(filteredCellArb, { minLength: 22, maxLength: 22 }), {
          minLength: 22,
          maxLength: 22,
        })
        .map(buildMatrix),
      fullMemoMatrixArb,
    ],
    { numRuns: 100 }
  )(
    'all-filtered algo matrix produces an empty TrainingCase array',
    (algoMatrix, memoMatrix) => {
      const cases = transformMatrices(algoMatrix, memoMatrix);
      expect(cases).toHaveLength(0);
    }
  );
});
