/**
 * Matrix Transformer property-based tests.
 * Feature: 3style-bld-edge-trainer
 *
 * Tests:
 *   Property 3 — Training Case Transformation Correctness
 *   Property 4 — Training Case Filtering
 */

import { describe, expect, test as vitestTest } from 'vitest';
import { fc, test } from '@fast-check/vitest';

import { transformMatrices, validateMemoCoversAlgo } from '../matrix-transformer';
import type { ParsedMatrix } from '../types';

const VALID_HEADERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
  'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
] as const;

const HEADER_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const matrixSizeArb = fc.constantFrom(21, 22);

const validHeadersArb = matrixSizeArb.chain((size) =>
  fc.uniqueArray(fc.constantFrom(...HEADER_POOL), {
    minLength: size,
    maxLength: size,
  }),
);

const validAlgoCellArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => {
    const normalized = s
      .trim()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[\s._:;|\\-]+/g, '')
      .replace(/[(){}[\]]/g, '');

    if (s.trim() === '-' || s.trim() === '--') return false;

    return ![
      'casonoexiste',
      'noexiste',
      'inexistente',
      'inexiste',
      'na',
      'n/a',
      'none',
      'null',
      'x',
      '-',
      '--',
    ].includes(normalized);
  });

const memoCellArb = fc.string({ maxLength: 20 });

function buildMatrix(cells: string[][], headers: string[]): ParsedMatrix {
  return {
    headers: {
      rows: headers,
      columns: headers,
    },
    data: cells,
  };
}

const fullMatrixPairArb = validHeadersArb.chain((headers) => {
  const size = headers.length;

  return fc
    .tuple(
      fc.array(fc.array(validAlgoCellArb, { minLength: size, maxLength: size }), {
        minLength: size,
        maxLength: size,
      }),
      fc.array(fc.array(memoCellArb, { minLength: size, maxLength: size }), {
        minLength: size,
        maxLength: size,
      }),
    )
    .map(([algoCells, memoCells]) => ({
      algoMatrix: buildMatrix(algoCells, headers),
      memoMatrix: buildMatrix(memoCells, headers),
      size,
    }));
});

describe('Property 3: Training Case Transformation Correctness', () => {
  test.prop([fullMatrixPairArb], { numRuns: 100 })(
    'every output TrainingCase has correct par, algoritmo, memo, and tipo fields',
    ({ algoMatrix, memoMatrix, size }) => {
      const cases = transformMatrices(algoMatrix, memoMatrix, 'arista');

      expect(cases).toHaveLength(size * size);

      cases.forEach((tc, index) => {
        const r = Math.floor(index / size);
        const c = index % size;

        const expectedPar = algoMatrix.headers.rows[r] + algoMatrix.headers.columns[c];
        const expectedAlgo = algoMatrix.data[r][c];
        const rawMemo = memoMatrix.data[r][c];
        const expectedMemo = rawMemo === '' ? 'Sin palabra' : rawMemo;

        expect(tc.par).toBe(expectedPar);
        expect(tc.algoritmo).toBe(expectedAlgo);
        expect(tc.memo).toBe(expectedMemo);
        expect(tc.tipo).toBe('arista');
      });
    },
  );
});

describe('Property 4: Training Case Filtering', () => {
  const CASO_NO_EXISTE_VARIANTS = [
    'caso no existe',
    'Caso No Existe',
    'CASO NO EXISTE',
    'Caso no existe',
    'cAsO nO eXiStE',
    'caso-no-existe',
    'Caso: no existe',
    'no existe',
    'No Existe',
    'inexistente',
    'N/A',
    'n.a.',
    'NA',
    'x',
    '-',
    '--',
  ];

  const filteredCellArb = fc.oneof(
    fc.constant(''),
    fc.constantFrom(...CASO_NO_EXISTE_VARIANTS),
  );

  const mixedCellArb = fc.oneof(filteredCellArb, validAlgoCellArb);

  const mixedAlgoMatrixArb: fc.Arbitrary<ParsedMatrix> = fc
    .array(fc.array(mixedCellArb, { minLength: 22, maxLength: 22 }), {
      minLength: 22,
      maxLength: 22,
    })
    .map((cells) => buildMatrix(cells, [...VALID_HEADERS]));

  const fixed22MemoMatrixArb: fc.Arbitrary<ParsedMatrix> = fc
    .array(fc.array(memoCellArb, { minLength: 22, maxLength: 22 }), {
      minLength: 22,
      maxLength: 22,
    })
    .map((cells) => buildMatrix(cells, [...VALID_HEADERS]));

  test.prop([mixedAlgoMatrixArb, fixed22MemoMatrixArb], { numRuns: 100 })(
    'output contains no empty algoritmo and no "caso no existe" algoritmo',
    (algoMatrix, memoMatrix) => {
      const cases = transformMatrices(algoMatrix, memoMatrix, 'arista');

      for (const tc of cases) {
        expect(tc.algoritmo).not.toBe('');
        expect(CASO_NO_EXISTE_VARIANTS).not.toContain(tc.algoritmo);
      }
    },
  );

  test.prop(
    [
      fc
        .array(fc.array(filteredCellArb, { minLength: 22, maxLength: 22 }), {
          minLength: 22,
          maxLength: 22,
        })
        .map((cells) => buildMatrix(cells, [...VALID_HEADERS])),
      fixed22MemoMatrixArb,
    ],
    { numRuns: 100 },
  )(
    'all-filtered algo matrix produces an empty TrainingCase array',
    (algoMatrix, memoMatrix) => {
      const cases = transformMatrices(algoMatrix, memoMatrix, 'arista');
      expect(cases).toHaveLength(0);
    },
  );
});

describe('Algorithm variants', () => {
  vitestTest('splits multiline algorithm cells into separate variants', () => {
    const algoCells = Array.from({ length: 22 }, () => Array(22).fill(''));
    const memoCells = Array.from({ length: 22 }, () => Array(22).fill(''));

    algoCells[0][1] = "R U R'\nU R U'\n\nM2 U M2";
    memoCells[0][1] = 'Alpha beta';

    const cases = transformMatrices(
      buildMatrix(algoCells, [...VALID_HEADERS]),
      buildMatrix(memoCells, [...VALID_HEADERS]),
      'arista',
    );

    expect(cases).toHaveLength(1);
    expect(cases[0].par).toBe('AB');
    expect(cases[0].algoritmo).toBe("R U R'\nU R U'\n\nM2 U M2");
    expect(cases[0].algoritmos).toEqual(["R U R'", "U R U'", 'M2 U M2']);
  });
});

describe('Shared memo matrix', () => {
  vitestTest('uses header lookup when memo matrix is larger than algo matrix', () => {
    const cornerHeaders = VALID_HEADERS.slice(0, 21);
    const algoCells = Array.from({ length: 21 }, () => Array(21).fill(''));
    const memoCells = Array.from({ length: 22 }, () => Array(22).fill(''));

    algoCells[0][1] = "R U R'";
    memoCells[0][1] = 'Alpha beta';

    const cases = transformMatrices(
      buildMatrix(algoCells, cornerHeaders),
      buildMatrix(memoCells, [...VALID_HEADERS]),
      'esquina',
    );

    expect(cases).toHaveLength(1);
    expect(cases[0].tipo).toBe('esquina');
    expect(cases[0].memo).toBe('Alpha beta');
    expect(validateMemoCoversAlgo(
      buildMatrix(algoCells, cornerHeaders),
      buildMatrix(memoCells, [...VALID_HEADERS]),
    ).isValid).toBe(true);
  });
});
