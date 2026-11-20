/**
 * csv-serializer.ts
 *
 * Converts between raw CSV text and ParsedMatrix, and generates downloadable
 * CSV Blobs. Used by the inline matrix editor.
 */

import Papa from 'papaparse'
import type { ParsedMatrix } from './types'
import { ALLOWED_MATRIX_SIZES, type MatrixSize } from './csv-parser'

// ---------------------------------------------------------------------------
// CSV text → ParsedMatrix
// ---------------------------------------------------------------------------

export interface ParseTextResult {
  matrix: ParsedMatrix | null
  errors: string[]
}

/**
 * Parses raw CSV text (as the user might paste or type) into a ParsedMatrix.
 * Returns errors instead of throwing, so the editor can display them inline.
 */
export function parseCSVText(text: string): ParseTextResult {
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
    transform: (value: string) => value.trim(),
  })

  const raw = result.data as string[][]
  return buildFromRaw(raw)
}

function buildFromRaw(raw: string[][]): ParseTextResult {
  const errors: string[] = []

  if (!raw || raw.length === 0) {
    return { matrix: null, errors: ['El CSV está vacío.'] }
  }

  const headerRow = raw[0]
  if (!headerRow || headerRow.length < 2) {
    return {
      matrix: null,
      errors: ['La primera fila debe tener una celda vacía en la esquina más las letras de columna.'],
    }
  }

  const columnCount = headerRow.length - 1
  if (!ALLOWED_MATRIX_SIZES.includes(columnCount as MatrixSize)) {
    return {
      matrix: null,
      errors: [
        `Se esperaban 21 o 22 letras de columna, pero se encontraron ${columnCount}.`,
      ],
    }
  }

  const size = columnCount as MatrixSize
  const expectedRows = size + 1

  if (raw.length !== expectedRows) {
    errors.push(
      `Se esperaban ${expectedRows} filas (1 cabecera + ${size} de datos), pero hay ${raw.length}. ` +
        'Elimina filas vacías o notas al final.',
    )
  }

  const columnHeaders = raw[0].slice(1, size + 1).map((h) => h.toUpperCase())
  const rowHeaders: string[] = []
  const data: string[][] = []

  for (let i = 1; i <= size; i++) {
    const row = raw[i] ?? []
    rowHeaders.push((row[0] ?? '').toUpperCase())
    data.push(row.slice(1, size + 1))
  }

  if (errors.length > 0) {
    return { matrix: null, errors }
  }

  return {
    matrix: { headers: { rows: rowHeaders, columns: columnHeaders }, data },
    errors: [],
  }
}

// ---------------------------------------------------------------------------
// ParsedMatrix → CSV text
// ---------------------------------------------------------------------------

/**
 * Serializes a ParsedMatrix back to a CSV string using PapaParse.
 * The first row is the header row (empty corner + column letters).
 * Each subsequent row starts with the row letter.
 */
export function serializeMatrixToCSV(matrix: ParsedMatrix): string {
  const { rows, columns } = matrix.headers

  const headerRow = ['', ...columns]
  const dataRows = rows.map((rowHeader, r) => [rowHeader, ...(matrix.data[r] ?? [])])

  return Papa.unparse([headerRow, ...dataRows])
}

// ---------------------------------------------------------------------------
// Blank matrix factory
// ---------------------------------------------------------------------------

/**
 * Creates an empty ParsedMatrix with the given letter headers.
 * Used to pre-populate the editor when the user starts from scratch.
 */
export function createBlankMatrix(size: MatrixSize): ParsedMatrix {
  const letters = EDGE_LETTERS.slice(0, size)
  const data = Array.from({ length: size }, () => Array(size).fill(''))
  return {
    headers: { rows: letters, columns: letters },
    data,
  }
}

/** Standard BLD letter set, A–V (22 letters). */
const EDGE_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
]

// ---------------------------------------------------------------------------
// Reconstruct memo matrix from stored TrainingCases
// ---------------------------------------------------------------------------

/**
 * Builds a ParsedMatrix for the memo tab pre-populated with the memos
 * already stored in existingCases. Used so the inline editor shows real
 * data instead of a blank grid when cases have already been imported.
 */
export function buildMemoMatrixFromCases(
  cases: Array<{ par: string; memo: string }>,
): ParsedMatrix {
  const letterSet = new Set<string>()
  for (const c of cases) {
    if (c.par.length === 2) {
      letterSet.add(c.par[0].toUpperCase())
      letterSet.add(c.par[1].toUpperCase())
    }
  }
  const letters = Array.from(letterSet).sort()

  const memoMap = new Map<string, string>()
  for (const c of cases) {
    memoMap.set(c.par.toUpperCase(), c.memo)
  }

  const data: string[][] = letters.map((rowLetter) =>
    letters.map((colLetter) => memoMap.get(rowLetter + colLetter) ?? ''),
  )

  return { headers: { rows: letters, columns: letters }, data }
}

// ---------------------------------------------------------------------------
// Reconstruct algorithm matrix from stored TrainingCases
// ---------------------------------------------------------------------------

/**
 * Builds a ParsedMatrix for an algorithm tab (aristas or esquinas) from the
 * TrainingCases already in storage. Each case's `algoritmo` field (the
 * original multiline cell text) goes back into the grid cell for par rowLetter+colLetter.
 *
 * Cases whose algoritmo is empty or "Sin algoritmo" are written as empty cells.
 */
export function buildAlgoMatrixFromCases(
  cases: Array<{ par: string; algoritmo: string }>,
): ParsedMatrix {
  const letterSet = new Set<string>()
  for (const c of cases) {
    if (c.par.length === 2) {
      letterSet.add(c.par[0].toUpperCase())
      letterSet.add(c.par[1].toUpperCase())
    }
  }
  const letters = Array.from(letterSet).sort()

  const algoMap = new Map<string, string>()
  for (const c of cases) {
    const algo = c.algoritmo?.trim() ?? ''
    if (algo) algoMap.set(c.par.toUpperCase(), algo)
  }

  const data: string[][] = letters.map((rowLetter) =>
    letters.map((colLetter) => algoMap.get(rowLetter + colLetter) ?? ''),
  )

  return { headers: { rows: letters, columns: letters }, data }
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

/**
 * Triggers a browser file download for the given CSV text.
 * Uses the Blob + anchor technique, works without any server.
 */
export function downloadCSV(csvText: string, filename: string): void {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Delay revoke so Safari has time to initiate the download
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
