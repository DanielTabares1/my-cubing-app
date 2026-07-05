'use client'

import { useEffect, useRef } from 'react'
import type { TrainerState, TrainingCase } from '@/app/lib/types'
import { splitAlgorithmVariants } from '@/app/lib/algorithm-variants'
import CaseCountBadge from './CaseCountBadge'

export interface TrainerCardProps {
  state: TrainerState
  currentCase: TrainingCase | null
  onAdvance: () => void
  onReset: () => void
  onRateGood: () => void
  onRateBad: () => void
  onToggleLearned: () => void
  totalCases: number
  algorithmStep: boolean
}

function primaryButtonLabel(state: TrainerState, algorithmStep: boolean): string {
  switch (state) {
    case 0:
      return 'Empezar practica'
    case 1:
      return 'Revelar memo'
    case 2:
      return algorithmStep ? 'Revelar algoritmo' : 'Siguiente caso'
    case 3:
      return 'Siguiente caso'
  }
}

function isRatingStage(state: TrainerState, algorithmStep: boolean): boolean {
  return algorithmStep ? state === 3 : state === 2
}

const stageLabels: Record<TrainerState, string> = {
  0: 'Preparacion',
  1: 'Reconocimiento',
  2: 'Memoria',
  3: 'Revision',
}

export default function TrainerCard({
  state,
  currentCase,
  onAdvance,
  onReset,
  onRateGood,
  onRateBad,
  onToggleLearned,
  totalCases,
  algorithmStep,
}: TrainerCardProps) {
  const showPar = state >= 1 && currentCase !== null
  const showMemo = state >= 2 && currentCase !== null
  const showAlgo = algorithmStep && state >= 3 && currentCase !== null
  const canStart = state !== 0 || totalCases > 0
  const showLearnedToggle = state >= 1 && currentCase !== null
  const showRating = isRatingStage(state, algorithmStep) && currentCase !== null
  const goodButtonRef = useRef<HTMLButtonElement>(null)
  const algorithmVariants = currentCase
    ? currentCase.algoritmos ?? splitAlgorithmVariants(currentCase.algoritmo)
    : []

  useEffect(() => {
    if (showRating) {
      goodButtonRef.current?.focus()
    }
  }, [showRating, currentCase?.par])

  return (
    <div
      className="flex w-full max-w-3xl flex-col rounded-xl border border-white/10 bg-stone-950/85 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-6 lg:p-8"
      role="region"
      aria-label="Tarjeta de practica"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <CaseCountBadge count={totalCases} />
        <div className="flex flex-wrap items-center gap-2">
          {showLearnedToggle && currentCase && (
            <button
              type="button"
              onClick={onToggleLearned}
              aria-pressed={currentCase.isLearned ?? false}
              className={[
                'inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
                currentCase.isLearned
                  ? 'border-emerald-200/30 bg-emerald-200/10 text-emerald-100'
                  : 'border-white/10 bg-white/[0.04] text-stone-300 hover:bg-white/[0.08]',
              ].join(' ')}
              aria-label={
                currentCase.isLearned
                  ? 'Marcar caso como no aprendido'
                  : 'Marcar caso como aprendido'
              }
            >
              <span
                className={[
                  'size-2 rounded-full',
                  currentCase.isLearned ? 'bg-emerald-300' : 'bg-stone-500',
                ].join(' ')}
                aria-hidden="true"
              />
              {currentCase.isLearned ? 'Aprendido' : 'Por aprender'}
              {(currentCase.streak ?? 0) > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-stone-300">
                  racha {currentCase.streak}
                </span>
              )}
            </button>
          )}
          <span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">
            {stageLabels[state]}
          </span>
        </div>
      </div>

      <div
        className={[
          'py-4',
          state === 0
            ? 'grid min-h-[240px] place-items-center sm:min-h-[280px]'
            : 'flex flex-col gap-5',
        ].join(' ')}
      >
        {state === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div
              className="mb-6 grid size-24 place-items-center rounded-xl border border-cyan-200/20 bg-cyan-200/10"
              aria-hidden="true"
            >
              <div className="grid grid-cols-2 gap-1">
                <span className="size-6 rounded-sm bg-cyan-200" />
                <span className="size-6 rounded-sm bg-emerald-300" />
                <span className="size-6 rounded-sm bg-amber-200" />
                <span className="size-6 rounded-sm bg-stone-300" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              {totalCases === 0 ? 'Carga tus matrices CSV' : 'Sesion lista'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              {totalCases === 0
                ? 'Importa algoritmos y memos para activar la practica.'
                : algorithmStep
                  ? 'Usa espacio para avanzar rapido. En evaluacion, espacio confirma Bien.'
                  : 'Usa espacio para avanzar rapido. En evaluacion, espacio confirma Bien.'}
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Par
              </p>
              <p className="mt-3 text-7xl font-black leading-none tracking-normal text-white sm:text-8xl">
                {showPar ? currentCase.par : '--'}
              </p>
            </section>

            <section
              className={[
                'grid gap-3',
                algorithmStep ? 'sm:grid-cols-2' : 'sm:grid-cols-1',
              ].join(' ')}
            >
              <RevealPanel label="Memo" visible={showMemo}>
                <span className="text-2xl font-semibold text-amber-100 sm:text-3xl">
                  {currentCase?.memo}
                </span>
              </RevealPanel>

              {algorithmStep && (
                <RevealPanel
                  label={algorithmVariants.length > 1 ? 'Algoritmos' : 'Algoritmo'}
                  visible={showAlgo}
                >
                  <AlgorithmVariants variants={algorithmVariants} />
                </RevealPanel>
              )}
            </section>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row">
        {showRating ? (
          <>
            <button
              ref={goodButtonRef}
              type="button"
              onClick={onRateGood}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-5 text-sm font-semibold text-stone-950 ring-2 ring-emerald-100 ring-offset-2 ring-offset-stone-950 transition hover:bg-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
              aria-label="Bien — recuerdo correcto"
            >
              Bien
              <span className="text-xs font-medium uppercase tracking-wide text-stone-700/80">
                (Space)
              </span>
            </button>
            <button
              type="button"
              onClick={onRateBad}
              tabIndex={-1}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border border-red-300/40 bg-red-400/15 px-5 text-sm font-semibold text-red-100 transition hover:bg-red-400/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              aria-label="Mal — olvide memo o algoritmo"
            >
              Mal
            </button>
            {algorithmStep && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-stone-100 transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:flex-none"
                aria-label="Repetir caso"
              >
                Repetir (R)
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onAdvance}
            disabled={!canStart}
            className={[
              'inline-flex min-h-12 flex-1 items-center justify-center rounded-lg px-5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
              canStart
                ? 'bg-cyan-200 text-stone-950 hover:bg-cyan-100 active:bg-cyan-300'
                : 'cursor-not-allowed bg-white/[0.06] text-stone-500',
            ].join(' ')}
            aria-label={primaryButtonLabel(state, algorithmStep)}
          >
            {primaryButtonLabel(state, algorithmStep)}
          </button>
        )}
      </div>
    </div>
  )
}

function AlgorithmVariants({ variants }: { variants: string[] }) {
  if (variants.length <= 1) {
    return (
      <span className="block break-words font-mono text-base leading-7 text-emerald-100 sm:text-lg">
        {variants[0]}
      </span>
    )
  }

  return (
    <div className="max-h-56 overflow-y-auto pr-1">
      <div className="grid gap-2">
        {variants.map((variant, index) => (
          <div
            key={`${index}-${variant}`}
            className="grid grid-cols-[2rem_1fr] gap-3 rounded-md border border-white/10 bg-stone-950/55 px-3 py-2"
          >
            <span className="mt-0.5 text-xs font-semibold tabular-nums text-stone-500">
              {index + 1}
            </span>
            <span className="break-words font-mono text-sm leading-6 text-emerald-100 sm:text-base">
              {variant}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RevealPanel({
  label,
  visible,
  children,
}: {
  label: string
  visible: boolean
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-stone-900/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <div className="mt-3">
        {visible ? (
          <div className="animate-fade-in w-full">{children}</div>
        ) : (
          <div className="grid w-full gap-3" aria-hidden="true">
            <span className="h-3 w-3/4 rounded-full bg-white/[0.07]" />
            <span className="h-3 w-1/2 rounded-full bg-white/[0.05]" />
          </div>
        )}
      </div>
    </div>
  )
}
