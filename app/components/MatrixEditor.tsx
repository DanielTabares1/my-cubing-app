'use client'

/**
 * MatrixEditor
 *
 * Inline spreadsheet editor for a single BLD CSV matrix (memo, edge
 * algorithms, or corner algorithms). Wraps react-data-grid.
 *
 * Features:
 * - Editable cells with keyboard navigation (Tab / arrows / Enter).
 * - Paste from Excel / Google Sheets.
 * - Row-letter column is frozen on the left.
 * - Structural validation errors shown below the grid.
 * - Download button exports the current grid as a .csv file.
 * - "Cargar archivo" button opens a file picker as a fallback.
 *
 * NOTE: This component is always rendered with a stable `key` from the
 * parent (CSVImporter uses `key={activeEditorKind}`). That means it remounts
 * when the user switches matrix tabs, so there is no need to sync the `value`
 * prop back into local state after mount — the initial value is enough.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataGrid, type Column, type RenderEditCellContentProps } from 'react-data-grid'
import 'react-data-grid/lib/styles.css'
import type { ParsedMatrix } from '@/app/lib/types'
import type { MatrixSize } from '@/app/lib/csv-parser'
import { validateMatrixStructure } from '@/app/lib/csv-parser'
import {
  createBlankMatrix,
  downloadCSV,
  parseCSVText,
  serializeMatrixToCSV,
} from '@/app/lib/csv-serializer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GridRow = { rowKey: string } & Record<string, string>

interface MatrixEditorProps {
  /** Initial matrix value; pass null to start with a blank grid. */
  value: ParsedMatrix | null
  kind: 'memo' | 'algo-arista' | 'algo-esquina'
  onChange: (matrix: ParsedMatrix) => void
  onValidationChange: (errors: string[]) => void
}

const KIND_LABELS: Record<MatrixEditorProps['kind'], string> = {
  memo: 'memos',
  'algo-arista': 'algoritmos-aristas',
  'algo-esquina': 'algoritmos-esquinas',
}

const DEFAULT_SIZES: Record<MatrixEditorProps['kind'], MatrixSize> = {
  memo: 22,
  'algo-arista': 22,
  'algo-esquina': 21,
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function matrixToGridRows(matrix: ParsedMatrix): GridRow[] {
  return matrix.headers.rows.map((rowLetter, r) => {
    const row: GridRow = { rowKey: rowLetter }
    matrix.headers.columns.forEach((colLetter, c) => {
      row[colLetter] = matrix.data[r]?.[c] ?? ''
    })
    return row
  })
}

function gridRowsToMatrix(rows: GridRow[], headers: ParsedMatrix['headers']): ParsedMatrix {
  return {
    headers,
    data: rows.map((row) => headers.columns.map((col) => row[col] ?? '')),
  }
}

// ---------------------------------------------------------------------------
// Inline text editor cell
// ---------------------------------------------------------------------------

function TextEditor({ row, column, onRowChange, onClose }: RenderEditCellContentProps<GridRow>) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.select() }, [])

  return (
    <input
      ref={ref}
      defaultValue={row[column.key] ?? ''}
      onChange={(e) => onRowChange({ ...row, [column.key]: e.target.value })}
      onBlur={() => onClose(true)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); onClose(false) }
        // Tab / Enter bubble to DataGrid for navigation
      }}
      style={{
        width: '100%', height: '100%', padding: '0 6px',
        border: 'none', outline: 'none',
        background: 'var(--rdg-editor-background, #1e2535)',
        color: 'inherit', font: 'inherit', fontSize: '12px',
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MatrixEditor({
  value,
  kind,
  onChange,
  onValidationChange,
}: MatrixEditorProps) {
  const defaultSize = DEFAULT_SIZES[kind]
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialise matrix from the prop (or blank). Because the parent mounts this
  // component with a stable key per matrix kind, `value` will not change after
  // mount — so a simple useState initializer is sufficient.
  const [matrix, setMatrix] = useState<ParsedMatrix>(() =>
    value ?? createBlankMatrix(defaultSize),
  )
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Validate and report to parent whenever the matrix changes.
  // We call this explicitly in every mutation path instead of an effect to
  // keep it synchronous and avoid cascading renders.
  const applyMatrix = useCallback(
    (m: ParsedMatrix) => {
      const result = validateMatrixStructure(m)
      setMatrix(m)
      setValidationErrors(result.errors)
      onValidationChange(result.errors)
      if (result.isValid) onChange(m)
    },
    [onChange, onValidationChange],
  )

  // Run initial validation once after mount so the parent knows the state of
  // the pre-populated grid right away. We use an empty-dep effect here: it
  // runs only once, after the first paint, and only reads state — it does not
  // set state via an effect, it calls applyMatrix which is a stable callback.
  const ranInitialValidation = useRef(false)
  useEffect(() => {
    if (ranInitialValidation.current) return
    ranInitialValidation.current = true
    applyMatrix(value ?? createBlankMatrix(defaultSize))
  // applyMatrix, value, defaultSize are all stable across this single mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns: Column<GridRow>[] = useMemo(() => {
    const rowKeyCol: Column<GridRow> = {
      key: 'rowKey',
      name: '',
      width: 32,
      frozen: true,
      resizable: false,
      cellClass: 'rdg-row-header-cell',
      renderCell: ({ row }) => (
        <span style={{ fontWeight: 700, fontSize: '11px', opacity: 0.55 }}>
          {row.rowKey}
        </span>
      ),
    }
    const dataCols: Column<GridRow>[] = matrix.headers.columns.map((colLetter) => ({
      key: colLetter,
      name: colLetter,
      width: 72,
      resizable: true,
      renderEditCell: (props) => <TextEditor {...props} />,
    }))
    return [rowKeyCol, ...dataCols]
  }, [matrix.headers.columns])

  // ── Rows ─────────────────────────────────────────────────────────────────
  const rows = useMemo(() => matrixToGridRows(matrix), [matrix])

  const handleRowsChange = useCallback(
    (newRows: GridRow[]) => {
      applyMatrix(gridRowsToMatrix(newRows, matrix.headers))
    },
    [applyMatrix, matrix.headers],
  )

  // ── File upload fallback ─────────────────────────────────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        const { matrix: parsed, errors } = parseCSVText(text)
        if (parsed) {
          applyMatrix(parsed)
        } else {
          setValidationErrors(errors)
          onValidationChange(errors)
        }
      }
      reader.readAsText(file, 'utf-8')
      e.target.value = ''
    },
    [applyMatrix, onValidationChange],
  )

  // ── Download ─────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    downloadCSV(serializeMatrixToCSV(matrix), `${KIND_LABELS[kind]}.csv`)
  }, [matrix, kind])

  // ── Clear ─────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    applyMatrix(createBlankMatrix(matrix.headers.rows.length as MatrixSize))
  }, [applyMatrix, matrix.headers.rows.length])

  // Filled cell count for the toolbar
  const filledCount = useMemo(
    () => rows.reduce(
      (acc, r) => acc + matrix.headers.columns.filter((c) => (r[c] ?? '').trim() !== '').length,
      0,
    ),
    [rows, matrix.headers.columns],
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="matrix-editor-root flex h-full flex-col gap-2">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[11px] font-semibold text-white/70 transition hover:bg-white/20 hover:text-white focus:outline-none"
        >
          <IconUpload />
          Cargar archivo
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[11px] font-semibold text-white/70 transition hover:bg-white/20 hover:text-white focus:outline-none"
        >
          <IconDownload />
          Descargar CSV
        </button>

        <span className="ml-auto text-[10px] text-white/30">
          {matrix.headers.rows.length}×{matrix.headers.columns.length}
          {' · '}
          {filledCount} celdas rellenas
        </span>

        <button
          type="button"
          onClick={handleClear}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] text-white/25 transition hover:bg-white/10 hover:text-[var(--danger)] focus:outline-none"
          aria-label="Limpiar grilla"
        >
          <IconTrash />
        </button>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <ul
          className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-[11px] text-[var(--danger)]"
          role="alert"
        >
          {validationErrors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      {/* Grid */}
      <div className="matrix-editor-grid-wrapper min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10">
        <DataGrid
          columns={columns}
          rows={rows}
          onRowsChange={(newRows) => handleRowsChange(newRows)}
          className="rdg-dark matrix-editor-grid"
          getRowKey={(row) => row.rowKey}
          style={{ blockSize: '100%' }}
          defaultColumnOptions={{ resizable: true }}
        />
      </div>

      <p className="text-[10px] text-white/25">
        Doble clic o Enter para editar · Tab / flechas para navegar · Pega desde Excel o Google Sheets
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconUpload() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1v7M3 4l3-3 3 3M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1v7M3 8l3 3 3-3M2 11h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 3h8M5 3V2h2v1M4 3v7h4V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
