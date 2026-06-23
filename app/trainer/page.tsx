'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TrainingCase, UserPreferences } from '@/app/lib/types'
import { StorageManager } from '@/app/lib/storage-manager'
import { useLocalStorage } from '@/app/hooks/useLocalStorage'
import { useTrainerState } from '@/app/hooks/useTrainerState'
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts'
import CSVImporter from '@/app/components/CSVImporter'
import TrainerCard from '@/app/components/TrainerCard'
import VisualTimer from '@/app/components/VisualTimer'

const DEFAULT_PREFS: UserPreferences = {
  timerVisible: true,
  selectionMode: 'random',
  algorithmStep: true,
  theme: 'dark',
}

export default function TrainerPage() {
  const [cases, setCases] = useLocalStorage<TrainingCase[]>('bld-trainer-cases', [])
  const [prefs, setPrefs] = useLocalStorage<UserPreferences>('bld-trainer-prefs', DEFAULT_PREFS)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const algorithmStep = prefs.algorithmStep ?? DEFAULT_PREFS.algorithmStep

  const { state, currentCase, advance, reset, startPractice, practiceCase } = useTrainerState(
    cases,
    prefs.selectionMode,
    algorithmStep,
  )

  const prevStateRef = useRef(state)
  const prevCaseRef = useRef<string | null>(null)
  const [timerResetToken, setTimerResetToken] = useState(false)

  useEffect(() => {
    const currentPar = currentCase?.par ?? null
    if (
      state === 1 &&
      (prevStateRef.current !== 1 || prevCaseRef.current !== currentPar)
    ) {
      setTimerResetToken((value) => !value)
    }
    prevStateRef.current = state
    prevCaseRef.current = currentPar
  }, [state, currentCase])

  useKeyboardShortcuts({
    onAdvance: advance,
    onReset: reset,
    enabled: state > 0,
  })

  const handleImportComplete = useCallback(
    (newCases: TrainingCase[]) => {
      try {
        StorageManager.saveTrainingCases(newCases)
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'No se pudieron guardar los casos en el almacenamiento local.'
        setErrorMessage(msg)
        console.error('TrainerPage: saveTrainingCases failed:', err)
      }
      setCases(newCases)
      setErrorMessage(null)
    },
    [setCases],
  )

  const handleError = useCallback((msg: string) => {
    setErrorMessage(msg)
  }, [])

  const handleClearData = useCallback(() => {
    StorageManager.clearTrainingCases()
    setCases([])
    setErrorMessage(null)
  }, [setCases])

  const handleToggleTimerVisibility = useCallback(() => {
    setPrefs((prev) => ({ ...prev, timerVisible: !prev.timerVisible }))
  }, [setPrefs])

  const handleToggleSelectionMode = useCallback(() => {
    setPrefs((prev) => ({
      ...prev,
      selectionMode: prev.selectionMode === 'random' ? 'sequential' : 'random',
    }))
  }, [setPrefs])

  const handleToggleAlgorithmStep = useCallback(() => {
    setPrefs((prev) => ({
      ...prev,
      algorithmStep: !(prev.algorithmStep ?? DEFAULT_PREFS.algorithmStep),
    }))
  }, [setPrefs])

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-semibold text-stone-200 transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              aria-label="Volver a herramientas"
            >
              &lt;
            </Link>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
                Herramienta activa
              </p>
              <h1 className="text-xl font-semibold text-white">3Style Trainer</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <VisualTimer
              isVisible={prefs.timerVisible}
              onToggleVisibility={handleToggleTimerVisibility}
              shouldReset={timerResetToken}
            />

            <button
              type="button"
              onClick={handleToggleSelectionMode}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-stone-200 transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              aria-label={`Cambiar a modo ${
                prefs.selectionMode === 'random' ? 'secuencial' : 'aleatorio'
              }`}
            >
              <span
                className="size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.7)]"
                aria-hidden="true"
              />
              {prefs.selectionMode === 'random' ? 'Aleatorio' : 'Secuencial'}
            </button>

            <button
              type="button"
              onClick={handleToggleAlgorithmStep}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-stone-200 transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              aria-pressed={!algorithmStep}
              aria-label={
                algorithmStep
                  ? 'Activar practica solo memo'
                  : 'Activar revision de algoritmo'
              }
            >
              <span
                className={[
                  'size-2 rounded-full shadow-[0_0_12px_rgba(103,232,249,0.7)]',
                  algorithmStep ? 'bg-cyan-300' : 'bg-amber-200',
                ].join(' ')}
                aria-hidden="true"
              />
              {algorithmStep ? 'Memo + algoritmo' : 'Solo memo'}
            </button>
          </div>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="grid size-7 shrink-0 place-items-center rounded-md text-red-100 transition hover:bg-red-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              aria-label="Cerrar error"
            >
              x
            </button>
          </div>
        )}

        <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[340px_1fr]">
          <aside className="flex flex-col gap-4 lg:sticky lg:top-5 lg:self-start">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
                Estado
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric label="Casos" value={cases.length.toString()} />
                <Metric
                  label="Modo"
                  value={prefs.selectionMode === 'random' ? 'Mix' : 'Seq'}
                />
                <Metric label="Revision" value={algorithmStep ? 'Alg' : 'Memo'} />
              </div>
            </div>

            <CaseSearch
              cases={cases}
              currentPar={currentCase?.par ?? null}
              onSelectCase={practiceCase}
            />

            <CSVImporter onImportComplete={handleImportComplete} onError={handleError} />

            {cases.length > 0 && (
              <button
                type="button"
                onClick={handleClearData}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-red-300/30 bg-red-400/10 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-400/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              >
                Borrar datos cargados
              </button>
            )}
          </aside>

          <section className="flex min-w-0 items-center justify-center rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(103,232,249,0.08),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-3 sm:p-6">
            <TrainerCard
              state={state}
              currentCase={currentCase}
              onAdvance={state === 0 ? startPractice : advance}
              onReset={reset}
              totalCases={cases.length}
              algorithmStep={algorithmStep}
            />
          </section>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-stone-950/50 px-3 py-3">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function CaseSearch({
  cases,
  currentPar,
  onSelectCase,
}: {
  cases: TrainingCase[]
  currentPar: string | null
  onSelectCase: (trainingCase: TrainingCase) => void
}) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toUpperCase()

  const matches = useMemo(() => {
    if (!normalizedQuery) return []

    return cases
      .filter((trainingCase) => trainingCase.par.toUpperCase().startsWith(normalizedQuery))
      .slice(0, 8)
  }, [cases, normalizedQuery])

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <label
        htmlFor="case-search"
        className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400"
      >
        Buscar caso
      </label>
      <div className="mt-3 flex gap-2">
        <input
          id="case-search"
          type="text"
          value={query}
          maxLength={2}
          disabled={cases.length === 0}
          onChange={(event) => {
            const value = event.target.value.replace(/[^a-z]/gi, '').toUpperCase()
            setQuery(value)
          }}
          placeholder="AB"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-stone-950/70 px-3 text-base font-semibold uppercase tracking-[0.18em] text-white outline-none transition placeholder:text-stone-600 focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:text-stone-600"
          aria-label="Buscar caso por pareja de letras"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-semibold text-stone-200 transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            aria-label="Limpiar busqueda"
          >
            x
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        {cases.length === 0 && (
          <p className="text-sm text-stone-500">Carga casos para buscar.</p>
        )}

        {cases.length > 0 && normalizedQuery.length === 0 && (
          <p className="text-sm text-stone-500">Escribe una pareja de letras.</p>
        )}

        {normalizedQuery.length > 0 && matches.length === 0 && (
          <p className="text-sm text-stone-500">No hay casos para {normalizedQuery}.</p>
        )}

        {matches.map((trainingCase) => {
          const isActive = trainingCase.par === currentPar
          return (
            <button
              key={trainingCase.par}
              type="button"
              onClick={() => onSelectCase(trainingCase)}
              className={[
                'flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
                isActive
                  ? 'border-cyan-200/50 bg-cyan-200/10 text-cyan-50'
                  : 'border-white/10 bg-stone-950/50 text-stone-200 hover:bg-white/[0.06]',
              ].join(' ')}
            >
              <span className="font-mono text-lg font-bold tracking-[0.16em]">
                {trainingCase.par}
              </span>
              <span className="min-w-0 truncate text-sm text-stone-400">
                {trainingCase.memo}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
