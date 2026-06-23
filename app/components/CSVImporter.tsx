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

const initialFileState: FileState = {
  file: null,
  status: 'idle',
  errorMessage: null,
}

const FILE_LABELS: Record<FileKind, string> = {
  memo: 'Memos (obligatorio)',
  'algo-arista': 'Algoritmos aristas',
  'algo-esquina': 'Algoritmos esquinas',
}

export default function CSVImporter({
  existingCases,
  onImportComplete,
  onError,
  onDismiss,
}: CSVImporterProps) {
  const [memoState, setMemoState] = useState<FileState>(initialFileState)
  const [edgeAlgoState, setEdgeAlgoState] = useState<FileState>(initialFileState)
  const [cornerAlgoState, setCornerAlgoState] = useState<FileState>(initialFileState)
  const [isProcessing, setIsProcessing] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<string | null>(null)

  const memoInputRef = useRef<HTMLInputElement>(null)
  const edgeAlgoInputRef = useRef<HTMLInputElement>(null)
  const cornerAlgoInputRef = useRef<HTMLInputElement>(null)

  const hasAlgoFile = edgeAlgoState.file !== null || cornerAlgoState.file !== null
  const canProcess = memoState.file !== null && hasAlgoFile && !isProcessing

  const fileStates: Record<FileKind, FileState> = {
    memo: memoState,
    'algo-arista': edgeAlgoState,
    'algo-esquina': cornerAlgoState,
  }

  const setFileState = useCallback((kind: FileKind, next: FileState) => {
    if (kind === 'memo') setMemoState(next)
    if (kind === 'algo-arista') setEdgeAlgoState(next)
    if (kind === 'algo-esquina') setCornerAlgoState(next)
  }, [])

  const applyFile = useCallback((kind: FileKind, file: File) => {
    setFileState(kind, { file, status: 'idle', errorMessage: null })
    setGlobalError(null)
    setImportSummary(null)
  }, [setFileState])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (kind: FileKind) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const droppedFile = event.dataTransfer.files?.[0]
      if (droppedFile) {
        applyFile(kind, droppedFile)
      }
    },
    [applyFile],
  )

  function handleInputChange(kind: FileKind) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        applyFile(kind, file)
      }
    }
  }

  async function parseAndValidate(file: File, label: string) {
    const parsed = await parseCSVFile(file)
    const validation = validateMatrixStructure(parsed)

    if (!validation.isValid) {
      throw new Error(`${label}: ${validation.errors.join(' ')}`)
    }

    return parsed
  }

  function markSuccess(kind: FileKind) {
    const current = fileStates[kind]
    setFileState(kind, { ...current, status: 'success', errorMessage: null })
  }

  function markError(kind: FileKind, message: string) {
    const current = fileStates[kind]
    setFileState(kind, { ...current, status: 'error', errorMessage: message })
  }

  async function processFiles() {
    if (!memoState.file || !hasAlgoFile) return

    setIsProcessing(true)
    setGlobalError(null)
    setImportSummary(null)

    if (memoState.file) {
      setMemoState((prev) => ({ ...prev, status: 'idle', errorMessage: null }))
    }
    if (edgeAlgoState.file) {
      setEdgeAlgoState((prev) => ({ ...prev, status: 'idle', errorMessage: null }))
    }
    if (cornerAlgoState.file) {
      setCornerAlgoState((prev) => ({ ...prev, status: 'idle', errorMessage: null }))
    }

    try {
      const memoMatrix = await parseAndValidate(memoState.file, 'Matriz de memos')
      markSuccess('memo')

      let mergedCases = normalizeTrainingCases(existingCases)
      const importedCounts = { aristas: 0, esquinas: 0 }

      if (edgeAlgoState.file) {
        const edgeAlgoMatrix = await parseAndValidate(
          edgeAlgoState.file,
          'Matriz de algoritmos (aristas)',
        )
        const edgeCases = transformMatrices(edgeAlgoMatrix, memoMatrix, 'arista')
        mergedCases = mergeCasesByType(mergedCases, edgeCases, 'arista')
        importedCounts.aristas = edgeCases.length
        markSuccess('algo-arista')
      }

      if (cornerAlgoState.file) {
        const cornerAlgoMatrix = await parseAndValidate(
          cornerAlgoState.file,
          'Matriz de algoritmos (esquinas)',
        )
        const cornerCases = transformMatrices(cornerAlgoMatrix, memoMatrix, 'esquina')
        mergedCases = mergeCasesByType(mergedCases, cornerCases, 'esquina')
        importedCounts.esquinas = cornerCases.length
        markSuccess('algo-esquina')
      }

      const summaryParts: string[] = []
      if (importedCounts.aristas > 0) {
        summaryParts.push(`${importedCounts.aristas} aristas`)
      }
      if (importedCounts.esquinas > 0) {
        summaryParts.push(`${importedCounts.esquinas} esquinas`)
      }

      setImportSummary(
        `Importados ${summaryParts.join(' y ')} (${mergedCases.length} casos en total).`,
      )
      onImportComplete(mergedCases)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudieron transformar los archivos CSV.'

      setGlobalError(msg)
      onError(msg)

      if (msg.includes('memos')) {
        markError('memo', msg)
      }
      if (msg.includes('aristas')) {
        markError('algo-arista', msg)
      }
      if (msg.includes('esquinas')) {
        markError('algo-esquina', msg)
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

  return (
    <section
      aria-label="Carga de archivos CSV"
      className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">Datos de practica</h2>
          <p className="mt-1 text-sm leading-5 text-stone-400">
            Sube el memo compartido y al menos un CSV de algoritmos. Cada archivo debe ser una
            matriz cuadrada de 21×21 o 22×22, sin filas ni columnas extra al final.
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="grid size-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-sm font-semibold text-stone-300 transition hover:bg-white/[0.08] hover:text-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            aria-label="Cerrar carga de archivos"
          >
            x
          </button>
        )}
      </div>

      <div className="grid gap-3">
        {(['memo', 'algo-arista', 'algo-esquina'] as const).map((kind) => (
          <DropZone
            key={kind}
            label={FILE_LABELS[kind]}
            kind={kind}
            fileState={fileStates[kind]}
            inputRef={inputRefs[kind]}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onInputChange={handleInputChange}
          />
        ))}
      </div>

      {globalError && (
        <p
          className="rounded-md border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm text-red-100"
          role="alert"
        >
          {globalError}
        </p>
      )}

      {importSummary && !globalError && (
        <p className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
          {importSummary}
        </p>
      )}

      <button
        type="button"
        disabled={!canProcess}
        onClick={processFiles}
        className={[
          'min-h-11 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
          canProcess
            ? 'cursor-pointer bg-emerald-300 text-stone-950 hover:bg-emerald-200'
            : 'cursor-not-allowed bg-white/[0.06] text-stone-500',
        ].join(' ')}
        aria-disabled={!canProcess}
      >
        {isProcessing ? 'Procesando...' : 'Importar casos'}
      </button>
    </section>
  )
}

function DropZone({
  label,
  kind,
  fileState,
  inputRef,
  onDragOver,
  onDrop,
  onInputChange,
}: {
  label: string
  kind: FileKind
  fileState: FileState
  inputRef: React.RefObject<HTMLInputElement | null>
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void
  onDrop: (kind: FileKind) => (event: React.DragEvent<HTMLDivElement>) => void
  onInputChange: (kind: FileKind) => (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-sm font-medium text-stone-200">{label}</p>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Subir ${label}`}
        className={[
          'relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
          dropzoneClass(fileState.status),
        ].join(' ')}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={onDragOver}
        onDrop={onDrop(kind)}
      >
        <span
          className="grid size-9 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-xs font-semibold text-stone-300"
          aria-hidden="true"
        >
          CSV
        </span>

        {fileState.file ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
              {fileState.status === 'success' ? 'Validado' : 'Seleccionado'}
            </span>
            <span className="break-all text-center text-sm text-stone-100">
              {fileState.file.name}
            </span>
          </div>
        ) : (
          <p className="text-center text-sm leading-5 text-stone-400">
            Arrastra el archivo o{' '}
            <span className="text-cyan-200 underline">seleccionalo</span>
          </p>
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
        <p className="text-xs text-red-200 break-words" role="alert">
          {fileState.errorMessage}
        </p>
      )}
    </div>
  )
}

function dropzoneClass(status: FileStatus) {
  if (status === 'success') return 'border-emerald-300/50 bg-emerald-300/[0.06]'
  if (status === 'error') return 'border-red-300/50 bg-red-300/[0.06]'
  return 'border-white/15 bg-stone-950/50 hover:border-cyan-200/50 hover:bg-cyan-200/[0.04]'
}
