/**
 * CSV Parser Module
 * Wraps PapaParse to parse CSV files and validate 22x22 matrix structure.
 * Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 14.1, 14.3, 15.1
 */

import Papa from 'papaparse';
import type { ParsedMatrix, ValidationResult } from './types';

// Letters A through V (22 letters)
const VALID_HEADERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'] as const;
const EXPECTED_HEADER_COUNT = 22;

/**
 * Parses a CSV File using PapaParse and returns a typed ParsedMatrix.
 *
 * The expected CSV layout is:
 *   Row 0  : [ignored/empty, ColA, ColB, ..., ColV]  (23 cells)
 *   Row 1  : [RowA, cell(A,A), cell(A,B), ..., cell(A,V)]
 *   ...
 *   Row 22 : [RowV, cell(V,A), ..., cell(V,V)]
 *
 * @param file - The CSV File to parse
 * @returns A resolved Promise with the ParsedMatrix
 * @throws An Error with a descriptive message on parse or structure failure
 */
export async function parseCSVFile(file: File): Promise<ParsedMatrix> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: false,
      transform: (value: string) => value.trim(),
      complete: (results) => {
        try {
          const matrix = buildParsedMatrix(results.data as string[][]);
          resolve(matrix);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`Could not parse CSV file: ${error.message}`));
      },
    });
  });
}

/**
 * Builds a ParsedMatrix from the raw 2D array produced by PapaParse.
 *
 * Expects:
 *  - At least 23 rows  (1 header row + 22 data rows)
 *  - At least 23 cols  (1 header col + 22 data cols)
 *  - Row headers  in column 0, rows 1–22
 *  - Column headers in row 0, cols 1–22
 *  - Data in rows 1–22, cols 1–22
 */
function buildParsedMatrix(raw: string[][]): ParsedMatrix {
  if (!raw || raw.length < 23) {
    const found = raw ? raw.length : 0;
    throw new Error(
      `Invalid matrix structure: Expected at least 23 rows (1 header + 22 data) but found ${found}.`
    );
  }

  // Column headers: row 0, cols 1–22
  const headerRow = raw[0];
  if (!headerRow || headerRow.length < 23) {
    const found = headerRow ? headerRow.length : 0;
    throw new Error(
      `Invalid matrix structure: Expected at least 23 columns (1 header + 22 data) in header row but found ${found}.`
    );
  }

  const columnHeaders = headerRow.slice(1, 23);

  // Row headers: col 0, rows 1–22
  const rowHeaders: string[] = [];
  for (let r = 1; r <= 22; r++) {
    if (!raw[r] || raw[r].length < 23) {
      throw new Error(
        `Invalid matrix structure: Row ${r} has fewer than 23 columns (expected 1 header + 22 data).`
      );
    }
    rowHeaders.push(raw[r][0]);
  }

  // Data: rows 1–22, cols 1–22
  const data: string[][] = [];
  for (let r = 1; r <= 22; r++) {
    data.push(raw[r].slice(1, 23));
  }

  return {
    headers: {
      rows: rowHeaders,
      columns: columnHeaders,
    },
    data,
  };
}

/**
 * Validates that a ParsedMatrix conforms to the expected 22×22 structure with
 * letters A–V as both row and column headers.
 *
 * Validation rules (from Requirements 2.1–2.6):
 *  1. Exactly 22 row headers
 *  2. Exactly 22 column headers
 *  3. Row headers are letters A–V (in order)
 *  4. Column headers are letters A–V (in order)
 *  5. Data grid is exactly 22 rows
 *  6. Each data row has exactly 22 columns
 *
 * Cell A1 (the top-left corner of the raw CSV, row 0 col 0) is allowed to be
 * empty or contain any text — it is intentionally ignored.
 *
 * @param matrix - The ParsedMatrix to validate
 * @returns A ValidationResult indicating success or listing all errors
 */
export function validateMatrixStructure(matrix: ParsedMatrix): ValidationResult {
  const errors: string[] = [];

  // --- Row header validation ---
  const { rows, columns } = matrix.headers;

  if (rows.length !== EXPECTED_HEADER_COUNT) {
    errors.push(
      `Expected ${EXPECTED_HEADER_COUNT} row headers but found ${rows.length}.`
    );
  } else {
    rows.forEach((header, index) => {
      if (header !== VALID_HEADERS[index]) {
        errors.push(
          `Row header at position ${index + 1} should be '${VALID_HEADERS[index]}' but found '${header}'.`
        );
      }
    });
  }

  // --- Column header validation ---
  if (columns.length !== EXPECTED_HEADER_COUNT) {
    errors.push(
      `Expected ${EXPECTED_HEADER_COUNT} column headers but found ${columns.length}.`
    );
  } else {
    columns.forEach((header, index) => {
      if (header !== VALID_HEADERS[index]) {
        errors.push(
          `Column header at position ${index + 1} should be '${VALID_HEADERS[index]}' but found '${header}'.`
        );
      }
    });
  }

  // --- Data grid validation ---
  if (matrix.data.length !== EXPECTED_HEADER_COUNT) {
    errors.push(
      `Expected ${EXPECTED_HEADER_COUNT} data rows but found ${matrix.data.length}.`
    );
  } else {
    matrix.data.forEach((row, rowIndex) => {
      if (row.length !== EXPECTED_HEADER_COUNT) {
        errors.push(
          `Data row ${rowIndex + 1} has ${row.length} columns but expected ${EXPECTED_HEADER_COUNT}.`
        );
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
