'use client'

/**
 * CSVImporter
 *
 * Panel de carga de datos con dos modos:
 *
 *  • "Subir archivo"  — drag-and-drop / file picker en la barra lateral.
 *  • "Editar en línea" — modal de pantalla completa con grilla editable.
 *    Los datos existentes se pre-cargan en las tres matrices.
 *
 * Cambios sin guardar: el modal muestra un indicador y el botón de diskette
 * cuando hay ediciones que todavía no se han importado al trainer.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ParsedMatrix, PieceType, TrainingCase } from '@/app/lib/types'
import { parseCSVFile, validateMatrixStructure } from '@/app/lib/csv-parser'
import { transformMatrices } from '@/app/lib/matrix-transformer'
import { mergeCasesByType, normalizeTrainingCases } from '@/app/lib/training-cases'
import {
  buildAlgoMatrixFromCases,
  buildMemoMatrixFromCases,
} from '@/app/lib/csv-serializer'
import MatrixEditor from '@/app/components/MatrixEditor'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter cases by piece type and reconstruct their algo matrix. */
function algoMatrixForType(cases: TrainingCase[], tipo: PieceType): ParsedMatrix | null {
  const filtered = cases.filter((c) => c.tipo === tipo)
  if (filtered.length === 0) return null
  return buildAlgoMatrixFromCases(filtered)
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CSVImporter({
  existingCases,
  onImportComplete,
  onError,
  onDismiss,
}: CSVImporterProps) {
  const hasCases = existingCases.length > 0

  // ── Upload mode state ─────────────────────────────────────────────────────
  const [memoState, setMemoState]             = useState<FileState>(initialFileState)
  const [edgeAlgoState, setEdgeAlgoState]     = useState<FileState>(initialFileState)
  const [cornerAlgoState, setCornerAlgoState] = useState<FileState>(initialFileState)

  // ── Shared ────────────────────────────────────────────────────────────────
  const [isProcessing, setIsProcessing]   = useState(false)
  const [globalError, setGlobalError]     = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<string | null>(null)

  // ── Editor modal ──────────────────────────────────────────────────────────
  const [editorOpen, setEditorOpen]             = useState(false)
  const [activeEditorKind, setActiveEditorKind] = useState<FileKind>('memo')

  // Pre-populate all three matrices from existing cases on first render.
  // Algo matrices are rebuilt from TrainingCase.algoritmo + par fields.
  const [memoMatrix, setMemoMatrix]             = useState<ParsedMatrix | null>(
    () => hasCases ? buildMemoMatrixFromCases(existingCases) : null,
  )
  const [edgeAlgoMatrix, setEdgeAlgoMatrix]     = useState<ParsedMatrix | null>(
    () => algoMatrixForType(existingCases, 'arista'),
  )
  const [cornerAlgoMatrix, setCornerAlgoMatrix] = useState<ParsedMatrix | null>(
    () => algoMatrixForType(existingCases, 'esquina'),
  )
  const [memoEditorErrors, setMemoEditorErrors]       = useState<string[]>([])
  const [edgeEditorErrors, setEdgeEditorErrors]       = useState<string[]>([])
  const [cornerEditorErrors, setCornerEditorErrors]   = useState<string[]>([])

  // Track whether the editor has unsaved changes (edits since last import).
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false)

  const memoInputRef       = useRef<HTMLInputElement>(null)
  const edgeAlgoInputRef   = useRef<HTMLInputElement>(null)
  const cornerAlgoInputRef = useRef<HTMLInputElement>(null)

  // Close modal on Escape
  useEffect(() => {
    if (!editorOpen) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditorOpen(false) }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [editorOpen])

  // ── Upload mode helpers ───────────────────────────────────────────────────
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

  const applyFile = useCallback(
    (kind: FileKind, file: File) => {
      setFileState(kind, { file, status: 'idle', errorMessage: null })
      setGlobalError(null)
      setImportSummary(null)
    },
    [setFileState],
  )

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

  async function parseAndValidateFile(file: File, label: string): Promise<ParsedMatrix> {
    const parsed = await parseCSVFile(file)
    const validation = validateMatrixStructure(parsed)
    if (!validation.isValid) throw new Error(`${label}: ${validation.errors.join(' ')}`)
    return parsed
  }

  function markFileSuccess(kind: FileKind) {
    setFileState(kind, { ...fileStates[kind], status: 'success', errorMessage: null })
  }
  function markFileError(kind: FileKind, message: string) {
    setFileState(kind, { ...fileStates[kind], status: 'error', errorMessage: message })
  }

  // ── Editor mode helpers ───────────────────────────────────────────────────
  const editorMatrices: Record<FileKind, ParsedMatrix | null> = {
    memo: memoMatrix,
    'algo-arista': edgeAlgoMatrix,
    'algo-esquina': cornerAlgoMatrix,
  }

  const setEditorMatrix = useCallback((kind: FileKind, m: ParsedMatrix) => {
    if (kind === 'memo')         setMemoMatrix(m)
    if (kind === 'algo-arista')  setEdgeAlgoMatrix(m)
    if (kind === 'algo-esquina') setCornerAlgoMatrix(m)
    setGlobalError(null)
    setImportSummary(null)
    setHasUnsavedEdits(true)
  }, [])

  const setEditorErrors = useCallback((kind: FileKind, errors: string[]) => {
    if (kind === 'memo')         setMemoEditorErrors(errors)
    if (kind === 'algo-arista')  setEdgeEditorErrors(errors)
    if (kind === 'algo-esquina') setCornerEditorErrors(errors)
  }, [])

  const editorErrors: Record<FileKind, string[]> = {
    memo: memoEditorErrors,
    'algo-arista': edgeEditorErrors,
    'algo-esquina': cornerEditorErrors,
  }

  // ── Shared import pipeline ────────────────────────────────────────────────
  async function resolveMatrix(
    kind: FileKind,
    mode: 'upload' | 'edit',
  ): Promise<ParsedMatrix | null> {
    if (mode === 'upload') {
      const file = fileStates[kind].file
      if (!file) return null
      const labels: Record<FileKind, string> = {
        memo: 'Matriz de memos',
        'algo-arista': 'Matriz de algoritmos (aristas)',
        'algo-esquina': 'Matriz de algoritmos (esquinas)',
      }
      return parseAndValidateFile(file, labels[kind])
    }
    const m = editorMatrices[kind]
    if (!m) return null
    const validation = validateMatrixStructure(m)
    if (!validation.isValid) throw new Error(validation.errors.join(' '))
    return m
  }

  // ── canProcess ────────────────────────────────────────────────────────────
  const uploadCanProcess = (() => {
    const hasAlgoFile = edgeAlgoState.file !== null || cornerAlgoState.file !== null
    const memoRequired = !hasCases
    return hasAlgoFile && (memoRequired ? memoState.file !== null : true) && !isProcessing
  })()

  const editCanProcess = (() => {
    const hasAlgoMatrix = edgeAlgoMatrix !== null || cornerAlgoMatrix !== null
    const hasErrors =
      memoEditorErrors.length > 0 ||
      edgeEditorErrors.length > 0 ||
      cornerEditorErrors.length > 0
    const memoRequired = !hasCases
    return hasAlgoMatrix && (memoRequired ? memoMatrix !== null : true) && !hasErrors && !isProcessing
  })()

  // ── Import handlers ───────────────────────────────────────────────────────
  async function runImport(mode: 'upload' | 'edit') {
    setIsProcessing(true)
    setGlobalError(null)
    setImportSummary(null)

    if (mode === 'upload') {
      if (memoState.file)       setMemoState((p) => ({ ...p, status: 'idle', errorMessage: null }))
      if (edgeAlgoState.file)   setEdgeAlgoState((p) => ({ ...p, status: 'idle', errorMessage: null }))
      if (cornerAlgoState.file) setCornerAlgoState((p) => ({ ...p, status: 'idle', errorMessage: null }))
    }

    try {
      const memoResolved = await resolveMatrix('memo', mode)
      let resolvedMemo: ParsedMatrix

      if (memoResolved) {
        resolvedMemo = memoResolved
        if (mode === 'upload') markFileSuccess('memo')
      } else if (hasCases) {
        resolvedMemo = buildMemoMatrixFromCases(existingCases)
      } else {
        throw new Error('Se requiere la matriz de memos para el primer import.')
      }

      let mergedCases = normalizeTrainingCases(existingCases)
      const counts = { aristas: 0, esquinas: 0 }

      const edgeMatrix = await resolveMatrix('algo-arista', mode)
      if (edgeMatrix) {
        const edgeCases = transformMatrices(edgeMatrix, resolvedMemo, 'arista')
        mergedCases = mergeCasesByType(mergedCases, edgeCases, 'arista')
        counts.aristas = edgeCases.length
        if (mode === 'upload') markFileSuccess('algo-arista')
      }

      const cornerMatrix = await resolveMatrix('algo-esquina', mode)
      if (cornerMatrix) {
        const cornerCases = transformMatrices(cornerMatrix, resolvedMemo, 'esquina')
        mergedCases = mergeCasesByType(mergedCases, cornerCases, 'esquina')
        counts.esquinas = cornerCases.length
        if (mode === 'upload') markFileSuccess('algo-esquina')
      }

      const parts: string[] = []
      if (counts.aristas > 0)  parts.push(`${counts.aristas} aristas`)
      if (counts.esquinas > 0) parts.push(`${counts.esquinas} esquinas`)
      setImportSummary(`Guardado: ${parts.join(' y ')} (${mergedCases.length} casos en total).`)
      setHasUnsavedEdits(false)
      onImportComplete(mergedCases)
      if (mode === 'edit') setEditorOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudieron transformar los datos CSV.'
      setGlobalError(msg)
      onError(msg)
      if (mode === 'upload') {
        if (msg.includes('memos'))    markFileError('memo', msg)
        if (msg.includes('aristas'))  markFileError('algo-arista', msg)
        if (msg.includes('esquinas')) markFileError('algo-esquina', msg)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const inputRefs: Record<FileKind, React.RefObject<HTMLInputElement | null>> = {
    memo: memoInputRef,
    'algo-arista': edgeAlgoInputRef,
    'algo-esquina': cornerAlgoInputRef,
  }

  function editorTabStatus(kind: FileKind): 'ready' | 'error' | 'empty' {
    if (editorErrors[kind].length > 0) return 'error'
    if (editorMatrices[kind] !== null) return 'ready'
    return 'empty'
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          SIDEBAR PANEL
      ══════════════════════════════════════════════════════════════════ */}
      <section aria-label="Carga de datos CSV" className="flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">Datos de práctica</h2>
            <p className="mt-0.5 text-xs leading-5 text-white/50">
              {hasCases
                ? 'Actualiza solo las matrices que necesites. El memo es opcional si ya tienes casos.'
                : 'Agrega el memo y al menos un CSV de algoritmos para empezar.'}
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

        {/* Drop zones */}
        <div className="flex flex-col gap-2">
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

        {/* Import from file */}
        <button
          type="button"
          disabled={!uploadCanProcess}
          onClick={() => runImport('upload')}
          className={[
            'h-11 w-full rounded-xl text-sm font-semibold transition focus:outline-none',
            uploadCanProcess
              ? 'bg-[var(--accent-sky)] text-[var(--accent)] hover:opacity-90'
              : 'cursor-not-allowed bg-white/10 text-white/30',
          ].join(' ')}
          aria-disabled={!uploadCanProcess}
        >
          {isProcessing ? 'Procesando…' : 'Importar casos'}
        </button>

        {/* Open editor modal */}
        <button
          type="button"
          onClick={() => setEditorOpen(true)}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-xs font-semibold text-white/50 transition hover:border-[var(--accent-sky)]/40 hover:text-white/80 focus:outline-none"
        >
          <IconGrid />
          Editar matrices en línea
          {hasUnsavedEdits && (
            <span className="ml-1 size-1.5 rounded-full bg-[var(--warn)]" aria-label="Cambios sin guardar" />
          )}
        </button>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          EDITOR MODAL (full-screen)
      ══════════════════════════════════════════════════════════════════ */}
      {editorOpen && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-[var(--bg-base)]"
          role="dialog"
          aria-modal="true"
          aria-label="Editor de matrices CSV"
        >
          {/* Top bar */}
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 sm:px-6">
            {/* Logo */}
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--accent-lavender)] text-[9px] font-black text-[var(--accent)]">
              CSV
            </span>
            <span className="hidden text-sm font-semibold text-[var(--text-primary)] sm:block">
              Editor de matrices
            </span>

            {/* Matrix kind tabs */}
            <div
              className="ml-2 flex gap-1 rounded-xl border border-[var(--border-muted)] bg-[var(--bg-overlay)] p-1 sm:ml-4"
              role="tablist"
              aria-label="Matriz a editar"
            >
              {(['memo', 'algo-arista', 'algo-esquina'] as const).map((kind) => {
                const status = editorTabStatus(kind)
                const isActive = activeEditorKind === kind
                return (
                  <button
                    key={kind}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveEditorKind(kind)}
                    className={[
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none',
                      isActive
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
                    ].join(' ')}
                  >
                    {FILE_LABELS[kind]}
                    {status !== 'empty' && (
                      <span
                        className={[
                          'size-1.5 rounded-full',
                          status === 'ready' ? 'bg-[var(--success)]' : 'bg-[var(--danger)]',
                        ].join(' ')}
                        aria-hidden="true"
                      />
                    )}
                    {kind === 'memo' && hasCases && (
                      <span className="rounded-full bg-[var(--border-subtle)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">
                        opt
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex-1" />

            {/* Unsaved changes indicator */}
            {hasUnsavedEdits && (
              <span className="hidden items-center gap-1.5 rounded-lg border border-[var(--warn-border)] bg-[var(--warn-bg)] px-2.5 py-1 text-xs font-medium text-[var(--warn)] sm:flex">
                <span className="size-1.5 rounded-full bg-[var(--warn)]" aria-hidden="true" />
                Cambios sin guardar
              </span>
            )}

            {/* Validation error from active tab */}
            {editorErrors[activeEditorKind].length > 0 && (
              <span className="hidden rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1 text-xs text-[var(--danger)] sm:inline">
                {editorErrors[activeEditorKind][0]}
              </span>
            )}

            {/* Save / Import button */}
            <button
              type="button"
              disabled={!editCanProcess || isProcessing}
              onClick={() => runImport('edit')}
              title={hasUnsavedEdits ? 'Guardar cambios' : 'Importar al trainer'}
              className={[
                'flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus:outline-none',
                editCanProcess && !isProcessing
                  ? 'bg-[var(--accent)] text-white hover:opacity-90'
                  : 'cursor-not-allowed bg-[var(--border-muted)] text-[var(--text-muted)]',
              ].join(' ')}
            >
              <IconSave />
              {isProcessing ? 'Guardando…' : 'Guardar'}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="grid size-9 place-items-center rounded-xl border border-[var(--border-muted)] text-[var(--text-secondary)] transition hover:border-[var(--danger-border)] hover:text-[var(--danger)] focus:outline-none"
              aria-label="Cerrar editor"
            >
              ✕
            </button>
          </div>

          {/* Grid area */}
          <div className="min-h-0 flex-1 p-4 sm:p-6">
            <MatrixEditor
              key={activeEditorKind}
              kind={activeEditorKind}
              value={editorMatrices[activeEditorKind]}
              onChange={(m) => setEditorMatrix(activeEditorKind, m)}
              onValidationChange={(errors) => setEditorErrors(activeEditorKind, errors)}
            />
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Drop zone
// ---------------------------------------------------------------------------

function DropZone({
  label, optional, kind, fileState, inputRef, onDragOver, onDrop, onInputChange,
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
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() }
        }}
        onDragOver={onDragOver}
        onDrop={onDrop(kind)}
      >
        <span
          className={[
            'grid size-8 shrink-0 place-items-center rounded-lg text-[9px] font-bold',
            hasFile ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50',
          ].join(' ')}
          aria-hidden="true"
        >
          {fileState.status === 'success' ? '✓' : 'CSV'}
        </span>

        <div className="min-w-0 flex-1">
          {hasFile ? (
            <p className="truncate text-xs font-semibold text-white">{fileState.file!.name}</p>
          ) : (
            <p className="text-xs text-white/40">
              Arrastra o <span className="text-[var(--accent-sky)] underline">selecciona</span>
            </p>
          )}
        </div>

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
        <p className="break-words text-[11px] text-[var(--danger)]" role="alert">
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

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconGrid() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 4.5h10M4.5 4.5v5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function IconSave() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="4" y="1" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="7" width="8" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 9.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
