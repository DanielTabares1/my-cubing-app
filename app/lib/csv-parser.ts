import Papa from 'papaparse';
import type { ParsedMatrix, ValidationResult } from './types';

export const ALLOWED_MATRIX_SIZES = [21, 22] as const;
export type MatrixSize = (typeof ALLOWED_MATRIX_SIZES)[number];

const LETTER_HEADER_PATTERN = /^[A-Z]$/i;

export async function parseCSVFile(file: File): Promise<ParsedMatrix> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: false,
      transform: (value: string) => value.trim(),
      complete: (results) => {
        try {
          resolve(buildParsedMatrix(results.data as string[][]));
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`No se pudo leer el archivo CSV: ${error.message}`));
      },
    });
  });
}

function validateRawCsvGrid(raw: string[][]): ValidationResult {
  const errors: string[] = [];

  if (!raw || raw.length === 0) {
    errors.push('El archivo CSV está vacío.');
    return { isValid: false, errors };
  }

  const headerRow = raw[0];
  if (!headerRow || headerRow.length < 2) {
    errors.push(
      'La primera fila debe incluir una celda vacía en la esquina y las letras de columna.',
    );
    return { isValid: false, errors };
  }

  const columnCount = headerRow.length - 1;
  if (!ALLOWED_MATRIX_SIZES.includes(columnCount as MatrixSize)) {
    errors.push(
      `Se esperaban exactamente 21 o 22 letras de columna, pero se encontraron ${columnCount}.`,
    );
    return { isValid: false, errors };
  }

  const size = columnCount as MatrixSize;
  const expectedRows = size + 1;
  const expectedCols = size + 1;

  if (raw.length !== expectedRows) {
    errors.push(
      `Se esperaban exactamente ${expectedRows} filas (1 cabecera + ${size} de datos), ` +
        `pero el archivo tiene ${raw.length}. ` +
        'Quita filas vacías, conteos o notas después de la matriz.',
    );
  }

  if (headerRow.length !== expectedCols) {
    errors.push(
      `La fila de cabecera debe tener exactamente ${expectedCols} columnas ` +
        `(esquina vacía + ${size} letras), pero tiene ${headerRow.length}.`,
    );
  }

  for (let rowIndex = 1; rowIndex <= size; rowIndex++) {
    const row = raw[rowIndex];
    if (!row) {
      errors.push(`Falta la fila de datos ${rowIndex + 1} de la hoja.`);
      continue;
    }

    if (row.length !== expectedCols) {
      errors.push(
        `La fila ${rowIndex + 1} debe tener exactamente ${expectedCols} columnas, ` +
          `pero tiene ${row.length}.`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function buildParsedMatrix(raw: string[][]): ParsedMatrix {
  const shape = validateRawCsvGrid(raw);
  if (!shape.isValid) {
    throw new Error(shape.errors.join(' '));
  }

  const size = (raw[0].length - 1) as MatrixSize;
  const totalCols = size + 1;

  const columnHeaders = raw[0].slice(1, totalCols).map((header) => header.toUpperCase());
  const rowHeaders: string[] = [];

  for (let rowIndex = 1; rowIndex <= size; rowIndex++) {
    rowHeaders.push(raw[rowIndex][0].toUpperCase());
  }

  const data: string[][] = [];
  for (let rowIndex = 1; rowIndex <= size; rowIndex++) {
    data.push(raw[rowIndex].slice(1, totalCols));
  }

  return {
    headers: {
      rows: rowHeaders,
      columns: columnHeaders,
    },
    data,
  };
}

export function validateMatrixStructure(matrix: ParsedMatrix): ValidationResult {
  const errors: string[] = [];
  const { rows, columns } = matrix.headers;
  const size = rows.length;

  if (!ALLOWED_MATRIX_SIZES.includes(size as MatrixSize)) {
    errors.push(
      `Se esperaban ${ALLOWED_MATRIX_SIZES.join(' o ')} letras de fila, pero se encontraron ${size}.`,
    );
  } else {
    validateLetterHeaders(rows, 'fila', errors);
  }

  if (!ALLOWED_MATRIX_SIZES.includes(columns.length as MatrixSize)) {
    errors.push(
      `Se esperaban ${ALLOWED_MATRIX_SIZES.join(' o ')} letras de columna, pero se encontraron ${columns.length}.`,
    );
  } else {
    validateLetterHeaders(columns, 'columna', errors);

    if (ALLOWED_MATRIX_SIZES.includes(rows.length as MatrixSize)) {
      columns.forEach((header, index) => {
        if (header !== rows[index]) {
          errors.push(
            `La letra de columna en la posición ${index + 1} debe coincidir con la letra de fila '${rows[index]}', ` +
              `pero se encontró '${header}'.`,
          );
        }
      });
    }
  }

  if (!ALLOWED_MATRIX_SIZES.includes(matrix.data.length as MatrixSize)) {
    errors.push(
      `Se esperaban ${ALLOWED_MATRIX_SIZES.join(' o ')} filas de datos, pero se encontraron ${matrix.data.length}.`,
    );
  } else {
    matrix.data.forEach((row, rowIndex) => {
      if (row.length !== size) {
        errors.push(
          `La fila de datos ${rowIndex + 1} tiene ${row.length} columnas, pero se esperaban ${size}.`,
        );
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateLetterHeaders(
  headers: string[],
  label: 'fila' | 'columna',
  errors: string[],
) {
  const seen = new Set<string>();

  headers.forEach((header, index) => {
    if (!LETTER_HEADER_PATTERN.test(header)) {
      errors.push(
        `La letra de ${label} en la posición ${index + 1} debe ser una sola letra, ` +
          `pero se encontró '${header}'.`,
      );
      return;
    }

    const normalized = header.toUpperCase();
    if (seen.has(normalized)) {
      errors.push(
        `La letra '${header}' aparece más de una vez en las cabeceras de ${label}. ` +
          'Cada letra debe ser única.',
      );
      return;
    }

    seen.add(normalized);
  });
}
