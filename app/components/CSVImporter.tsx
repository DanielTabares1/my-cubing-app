'use client'

import { useCallback, useRef, useState } from 'react'
import type { TrainingCase } from '@/app/lib/types'
import { parseCSVFile, validateMatrixStructure } from '@/app/lib/csv-parser'
import { transformMatrices } from '@/app/lib/matrix-transformer'

interface CSVImporterProps {
  onImportComplete: (cases: TrainingCase[]) => void
  onError: (error: string) => void
}

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

export default function CSVImporter({ onImportComplete, onError }: CSVImporterProps) {
  const [algoState, setAlgoState] = useState<FileState>(initialFileState)
  const [memoState, setMemoState] = useState<FileState>(initialFileState)
  const [isProcessing, setIsProcessing] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const algoInputRef = useRef<HTMLInputElement>(null)
  const memoInputRef = useRef<HTMLInputElement>(null)

  const canProcess = algoState.file !== null && memoState.file !== null && !isProcessing

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const applyFile = useCallback((type: 'algo' | 'memo', file: File) => {
    const setter = type === 'algo' ? setAlgoState : setMemoState
    setter({ file, status: 'idle', errorMessage: null })
    setGlobalError(null)
  }, [])

  const handleDrop = useCallback(
    (type: 'algo' | 'memo') => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const droppedFile = event.dataTransfer.files?.[0]
      if (droppedFile) {
        applyFile(type, droppedFile)
      }
    },
    [applyFile],
  )

  function handleInputChange(type: 'algo' | 'memo') {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        applyFile(type, file)
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

  async function processFiles() {
    if (!algoState.file || !memoState.file) return

    setIsProcessing(true)
    setGlobalError(null)
    setAlgoState((prev) => ({ ...prev, status: 'idle', errorMessage: null }))
    setMemoState((prev) => ({ ...prev, status: 'idle', errorMessage: null }))

    try {
      const [algoMatrix, memoMatrix] = await Promise.all([
        parseAndValidate(algoState.file, 'Matriz de algoritmos'),
        parseAndValidate(memoState.file, 'Matriz de memos'),
      ])

      setAlgoState((prev) => ({ ...prev, status: 'success', errorMessage: null }))
      setMemoState((prev) => ({ ...prev, status: 'success', errorMessage: null }))

      const cases = transformMatrices(algoMatrix, memoMatrix)
      onImportComplete(cases)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudieron transformar los archivos CSV.'
      setGlobalError(msg)
      onError(msg)

      const isAlgoError = msg.includes('algoritmos')
      const isMemoError = msg.includes('memos')
      if (isAlgoError || !isMemoError) {
        setAlgoState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
      }
      if (isMemoError || !isAlgoError) {
        setMemoState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <section
      aria-label="Carga de archivos CSV"
      className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4"
    >
      <div>
        <h2 className="text-base font-semibold text-white">Datos de practica</h2>
        <p className="mt-1 text-sm leading-5 text-stone-400">
          Sube la matriz de algoritmos y la matriz de memos.
        </p>
      </div>

      <div className="grid gap-3">
        <DropZone
          label="Algoritmos"
          type="algo"
          fileState={algoState}
          inputRef={algoInputRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onInputChange={handleInputChange}
        />
        <DropZone
          label="Memos"
          type="memo"
          fileState={memoState}
          inputRef={memoInputRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onInputChange={handleInputChange}
        />
      </div>

      {globalError && (
        <p
          className="rounded-md border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm text-red-100"
          role="alert"
        >
          {globalError}
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
  type,
  fileState,
  inputRef,
  onDragOver,
  onDrop,
  onInputChange,
}: {
  label: string
  type: 'algo' | 'memo'
  fileState: FileState
  inputRef: React.RefObject<HTMLInputElement | null>
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void
  onDrop: (
    type: 'algo' | 'memo',
  ) => (event: React.DragEvent<HTMLDivElement>) => void
  onInputChange: (
    type: 'algo' | 'memo',
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void
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
        onDrop={onDrop(type)}
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
          onChange={onInputChange(type)}
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
