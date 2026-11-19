'use client'

import { useCallback, useRef, useState } from 'react'
import type { TrainingCase } from '@/app/lib/types'
import { parseCSVFile, validateMatrixStructure } from '@/app/lib/csv-parser'
import { transformMatrices } from '@/app/lib/matrix-transformer'
import { mergeCasesByType, normalizeTrainingCases } from '@/app/lib/training-cases'

interface CSVImporterProps {
  existingCases: TrainingCase[]
  onImportComplete: (cases: TrainingCase[]) => void
  onError: (error: string) => void
  onDismiss?: () => void
}

type FileKind = 'memo' | 'algo-arista' | 'algo-esquina'
type FileStatus = 'idle' | 'success' | 'error'

interface FileState {
  file: File | null
  status: FileStatus
  errorMessage: string | null
}

const initialFileState: FileState = { file: null, status: 'idle', errorMessage: null }

const FILE_LABELS: Record<FileKind, string> = {
  memo: 'Memos',
  'algo-arista': 'Algoritmos aristas',
  'algo-esquina': 'Algoritmos esquinas',
}

export default function CSVImporter({
  existingCases,
  onImportComplete,
  onError,
  onDismiss,
}: CSVImporterProps) {
  const [memoState, setMemoState]           = useState<FileState>(initialFileState)
  const [edgeAlgoState, setEdgeAlgoState]   = useState<FileState>(initialFileState)
  const [cornerAlgoState, setCornerAlgoState] = useState<FileState>(initialFileState)
  const [isProcessing, setIsProcessing]     = useState(false)
  const [globalError, setGlobalError]       = useState<string | null>(null)
  const [importSummary, setImportSummary]   = useState<string | null>(null)

  const memoInputRef        = useRef<HTMLInputElement>(null)
  const edgeAlgoInputRef    = useRef<HTMLInputElement>(null)
  const cornerAlgoInputRef  = useRef<HTMLInputElement>(null)

  // When cases already exist, memo is optional (the existing memos are reused).
  const hasCases       = existingCases.length > 0
  const hasAlgoFile    = edgeAlgoState.file !== null || cornerAlgoState.file !== null
  const memoRequired   = !hasCases   // memo is only mandatory on first import
  const memoProvided   = memoState.file !== null
  const canProcess     = hasAlgoFile && (memoRequired ? memoProvided : true) && !isProcessing

  const fileStates: Record<FileKind, FileState> = {
    memo: memoState,
    'algo-arista': edgeAlgoState,
    'algo-esquina': cornerAlgoState,
  }

  const setFileState = useCallback((kind: FileKind, next: FileState) => {
    if (kind === 'memo')         setMemoState(next)
    if (kind === 'algo-arista')  setEdgeAlgoState(next)
    if (kind === 'algo-esquina') setCornerAlgoState(next)
  }, [])

  const applyFile = useCallback((kind: FileKind, file: File) => {
    setFileState(kind, { file, status: 'idle', errorMessage: null })
    setGlobalError(null)
    setImportSummary(null)
  }, [setFileState])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (kind: FileKind) => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault(); e.stopPropagation()
      const f = e.dataTransfer.files?.[0]
      if (f) applyFile(kind, f)
    },
    [applyFile],
  )

  function handleInputChange(kind: FileKind) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) applyFile(kind, f)
    }
  }

  async function parseAndValidate(file: File, label: string) {
    const parsed = await parseCSVFile(file)
    const validation = validateMatrixStructure(parsed)
    if (!validation.isValid) throw new Error(`${label}: ${validation.errors.join(' ')}`)
    return parsed
  }

  function markSuccess(kind: FileKind) {
    setFileState(kind, { ...fileStates[kind], status: 'success', errorMessage: null })
  }
  function markError(kind: FileKind, message: string) {
    setFileState(kind, { ...fileStates[kind], status: 'error', errorMessage: message })
  }

  async function processFiles() {
    if (!canProcess) return

    setIsProcessing(true)
    setGlobalError(null)
    setImportSummary(null)

    // Reset statuses
    if (memoState.file)       setMemoState((p)       => ({ ...p, status: 'idle', errorMessage: null }))
    if (edgeAlgoState.file)   setEdgeAlgoState((p)   => ({ ...p, status: 'idle', errorMessage: null }))
    if (cornerAlgoState.file) setCornerAlgoState((p) => ({ ...p, status: 'idle', errorMessage: null }))

    try {
      // If no new memo is provided, build a synthetic ParsedMatrix from existing cases
      const memoMatrix = memoState.file
        ? await parseAndValidate(memoState.file, 'Matriz de memos')
        : buildMemoMatrixFromCases(existingCases)

      if (memoState.file) markSuccess('memo')

      let mergedCases = normalizeTrainingCases(existingCases)
      const importedCounts = { aristas: 0, esquinas: 0 }

      if (edgeAlgoState.file) {
        const edgeAlgoMatrix = await parseAndValidate(edgeAlgoState.file, 'Matriz de algoritmos (aristas)')
        const edgeCases = transformMatrices(edgeAlgoMatrix, memoMatrix, 'arista')
        mergedCases = mergeCasesByType(mergedCases, edgeCases, 'arista')
        importedCounts.aristas = edgeCases.length
        markSuccess('algo-arista')
      }

      if (cornerAlgoState.file) {
        const cornerAlgoMatrix = await parseAndValidate(cornerAlgoState.file, 'Matriz de algoritmos (esquinas)')
        const cornerCases = transformMatrices(cornerAlgoMatrix, memoMatrix, 'esquina')
        mergedCases = mergeCasesByType(mergedCases, cornerCases, 'esquina')
        importedCounts.esquinas = cornerCases.length
        markSuccess('algo-esquina')
      }

      const summaryParts: string[] = []
      if (importedCounts.aristas > 0) summaryParts.push(`${importedCounts.aristas} aristas`)
      if (importedCounts.esquinas > 0) summaryParts.push(`${importedCounts.esquinas} esquinas`)
      setImportSummary(`Importados ${summaryParts.join(' y ')} (${mergedCases.length} casos en total).`)
      onImportComplete(mergedCases)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudieron transformar los archivos CSV.'
      setGlobalError(msg)
      onError(msg)
      if (msg.includes('memos'))    markError('memo', msg)
      if (msg.includes('aristas'))  markError('algo-arista', msg)
      if (msg.includes('esquinas')) markError('algo-esquina', msg)
    } finally {
      setIsProcessing(false)
    }
  }

  const inputRefs: Record<FileKind, React.RefObject<HTMLInputElement | null>> = {
    memo: memoInputRef,
    'algo-arista': edgeAlgoInputRef,
    'algo-esquina': cornerAlgoInputRef,
  }

  return (
    <section aria-label="Carga de archivos CSV" className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">Datos de práctica</h2>
          <p className="mt-0.5 text-xs leading-5 text-white/50">
            {hasCases
              ? 'Sube solo los archivos que quieras actualizar. El memo es opcional si ya tienes casos cargados.'
              : 'Sube el memo y al menos un CSV de algoritmos para empezar.'}
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white focus:outline-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        )}
      </div>

      {/* File drop zones */}
      <div className="grid gap-2">
        {(['memo', 'algo-arista', 'algo-esquina'] as const).map((kind) => (
          <DropZone
            key={kind}
            label={FILE_LABELS[kind]}
            optional={kind === 'memo' && hasCases}
            kind={kind}
            fileState={fileStates[kind]}
            inputRef={inputRefs[kind]}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onInputChange={handleInputChange}
          />
        ))}
      </div>

      {/* Errors / success */}
      {globalError && (
        <p className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger)]" role="alert">
          {globalError}
        </p>
      )}
      {importSummary && !globalError && (
        <p className="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-2 text-xs text-[var(--success)]">
          {importSummary}
        </p>
      )}

      {/* Submit */}
      <button
        type="button"
        disabled={!canProcess}
        onClick={processFiles}
        className={[
          'h-11 w-full rounded-xl text-sm font-semibold transition focus:outline-none',
          canProcess
            ? 'bg-[var(--accent-sky)] text-[var(--accent)] hover:opacity-90'
            : 'cursor-not-allowed bg-white/10 text-white/30',
        ].join(' ')}
        aria-disabled={!canProcess}
      >
        {isProcessing ? 'Procesando…' : 'Importar casos'}
      </button>
    </section>
  )
}

/* ─── Drop zone ─────────────────────────────────────────────────────────────── */
function DropZone({
  label,
  optional,
  kind,
  fileState,
  inputRef,
  onDragOver,
  onDrop,
  onInputChange,
}: {
  label: string
  optional: boolean
  kind: FileKind
  fileState: FileState
  inputRef: React.RefObject<HTMLInputElement | null>
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (kind: FileKind) => (e: React.DragEvent<HTMLDivElement>) => void
  onInputChange: (kind: FileKind) => (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const hasFile = fileState.file !== null

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-white/80">{label}</p>
        {optional && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/40">
            opcional
          </span>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={`Subir ${label}`}
        className={[
          'relative flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
          dropzoneClass(fileState.status, hasFile),
        ].join(' ')}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
        onDragOver={onDragOver}
        onDrop={onDrop(kind)}
      >
        {/* Icon */}
        <span
          className={[
            'grid size-8 shrink-0 place-items-center rounded-lg text-[9px] font-bold',
            hasFile ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50',
          ].join(' ')}
          aria-hidden="true"
        >
          {fileState.status === 'success' ? '✓' : 'CSV'}
        </span>

        {/* Label / filename */}
        <div className="min-w-0 flex-1">
          {hasFile ? (
            <p className="truncate text-xs font-semibold text-white">
              {fileState.file!.name}
            </p>
          ) : (
            <p className="text-xs text-white/40">
              Arrastra o <span className="text-[var(--accent-sky)] underline">selecciona</span>
            </p>
          )}
        </div>

        {/* Status badge */}
        {fileState.status === 'success' && (
          <span className="shrink-0 rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
            OK
          </span>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={onInputChange(kind)}
        />
      </div>

      {fileState.status === 'error' && fileState.errorMessage && (
        <p className="text-[11px] text-[var(--danger)] break-words" role="alert">
          {fileState.errorMessage}
        </p>
      )}
    </div>
  )
}

function dropzoneClass(status: FileStatus, hasFile: boolean): string {
  if (status === 'success') return 'border-[var(--success-border)] bg-[var(--success-bg)]'
  if (status === 'error')   return 'border-[var(--danger-border)] bg-[var(--danger-bg)]'
  if (hasFile)              return 'border-white/25 bg-white/10'
  return 'border-white/10 bg-white/5 hover:border-[var(--accent-sky)]/40 hover:bg-white/10'
}

/* ─── Build memo matrix from existing cases ─────────────────────────────────
   When no new memo CSV is provided, reconstruct a minimal ParsedMatrix from
   the memos already stored in existingCases so transformMatrices can still run.
   This only needs the par → memo mapping, which transformMatrices uses via
   the headers + data lookup.
─────────────────────────────────────────────────────────────────────────── */
import type { ParsedMatrix } from '@/app/lib/types'

function buildMemoMatrixFromCases(cases: TrainingCase[]): ParsedMatrix {
  // Collect unique letters from all pairs
  const letterSet = new Set<string>()
  for (const c of cases) {
    if (c.par.length === 2) {
      letterSet.add(c.par[0].toUpperCase())
      letterSet.add(c.par[1].toUpperCase())
    }
  }
  const letters = Array.from(letterSet).sort()

  // Build an N×N data grid where data[r][c] = memo for pair letters[r]+letters[c]
  const memoMap = new Map<string, string>()
  for (const c of cases) {
    memoMap.set(c.par.toUpperCase(), c.memo)
  }

  const data: string[][] = letters.map((rowLetter) =>
    letters.map((colLetter) => memoMap.get(rowLetter + colLetter) ?? ''),
  )

  return {
    headers: { rows: letters, columns: letters },
    data,
  }
}
