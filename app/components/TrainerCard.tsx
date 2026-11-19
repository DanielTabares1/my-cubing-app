'use client'

import { useEffect, useRef } from 'react'
import type { TrainerState, TrainingCase } from '@/app/lib/types'
import type { RoundStats } from '@/app/lib/round-stats'
import { getCaseProgressBadge } from '@/app/lib/case-progress'
import { splitAlgorithmVariants } from '@/app/lib/algorithm-variants'
import CaseCountBadge from './CaseCountBadge'
import RoundProgress from './RoundProgress'
import CubeViewer from './CubeViewer'

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
  roundStats: RoundStats | null
  cubeVisible: boolean
  cubeOrientationAlg: string
}

function primaryButtonLabel(state: TrainerState, algorithmStep: boolean): string {
  switch (state) {
    case 0: return 'Empezar práctica'
    case 1: return 'Revelar memo'
    case 2: return algorithmStep ? 'Revelar algoritmo' : 'Siguiente caso'
    case 3: return 'Siguiente caso'
  }
}

function isRatingStage(state: TrainerState, algorithmStep: boolean): boolean {
  return algorithmStep ? state === 3 : state === 2
}

const stageLabel: Record<TrainerState, string> = {
  0: 'Preparación',
  1: 'Reconocimiento',
  2: 'Memoria',
  3: 'Revisión',
}

const stagePill: Record<TrainerState, string> = {
  0: 'bg-[var(--bg-overlay)] text-[var(--text-muted)]',
  1: 'bg-[var(--accent-lavender)] text-[var(--accent)]',
  2: 'bg-[var(--warn-bg)] text-[var(--warn)]',
  3: 'bg-[var(--success-bg)] text-[var(--success)]',
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
  roundStats,
  cubeVisible,
  cubeOrientationAlg,
}: TrainerCardProps) {
  const showPar  = state >= 1 && currentCase !== null
  const showMemo = state >= 2 && currentCase !== null
  const showAlgo = algorithmStep && state >= 3 && currentCase !== null
  const canStart = state !== 0 || totalCases > 0
  const showLearnedToggle = state >= 1 && currentCase !== null
  const showRating = isRatingStage(state, algorithmStep) && currentCase !== null
  const goodButtonRef = useRef<HTMLButtonElement>(null)
  const algorithmVariants = currentCase
    ? currentCase.algoritmos ?? splitAlgorithmVariants(currentCase.algoritmo)
    : []
  const progressBadge = currentCase ? getCaseProgressBadge(currentCase) : null
  const showCube = cubeVisible && state >= 1 && currentCase !== null
  const currentAlg = algorithmVariants[0] ?? ''

  useEffect(() => {
    if (showRating) goodButtonRef.current?.focus()
  }, [showRating, currentCase?.par])

  return (
    <div
      className="w-full max-w-2xl rounded-3xl bg-[var(--bg-surface)]"
      style={{ boxShadow: 'var(--shadow-card)' }}
      role="region"
      aria-label="Tarjeta de práctica"
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-6 py-4">
        <CaseCountBadge count={totalCases} />

        <div className="flex flex-wrap items-center gap-2">
          {showLearnedToggle && currentCase && (
            <button
              type="button"
              onClick={onToggleLearned}
              aria-pressed={currentCase.isLearned ?? false}
              className={[
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                currentCase.isLearned
                  ? 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]'
                  : 'border-[var(--border-muted)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
              ].join(' ')}
            >
              <span
                className={['size-1.5 rounded-full', currentCase.isLearned ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'].join(' ')}
                aria-hidden="true"
              />
              {currentCase.isLearned ? 'Aprendido' : 'Por aprender'}
              {progressBadge && (
                <span className="ml-0.5 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                  {progressBadge}
                </span>
              )}
            </button>
          )}

          <span className={['inline-flex h-7 items-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.12em]', stagePill[state]].join(' ')}>
            {stageLabel[state]}
          </span>
        </div>
      </div>

      {/* ── Round progress ── */}
      {state > 0 && roundStats && (
        <div className="border-b border-[var(--border-subtle)] px-6 py-3">
          <RoundProgress roundStats={roundStats} />
        </div>
      )}

      {/* ── Body ── */}
      <div
        className={[
          'px-6',
          state === 0
            ? 'flex min-h-[260px] items-center justify-center py-8'
            : 'flex flex-col gap-4 py-5',
        ].join(' ')}
      >
        {state === 0 ? (
          <div className="flex flex-col items-center text-center">
            {/* Decorative icon */}
            <div
              className="mb-6 grid size-20 place-items-center rounded-3xl bg-[var(--accent-lavender)]"
              aria-hidden="true"
            >
              <div className="grid grid-cols-2 gap-1.5">
                <span className="size-5 rounded-md bg-[var(--accent)]" />
                <span className="size-5 rounded-md bg-[var(--accent-sky)]" />
                <span className="size-5 rounded-md bg-[var(--warn)]" />
                <span className="size-5 rounded-md bg-[var(--success-light)]" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {totalCases === 0 ? 'Carga tus matrices CSV' : 'Sesión lista'}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
              {totalCases === 0
                ? 'Importa algoritmos y memos para activar la práctica.'
                : 'Usa espacio para avanzar. En evaluación, espacio confirma Bien.'}
            </p>
          </div>
        ) : (
          <>
            {/* Par */}
            <section
              className={[
                'rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] p-5',
                showCube ? 'flex items-center gap-5' : 'text-center',
              ].join(' ')}
            >
              <div className={showCube ? 'shrink-0' : 'w-full'}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Par
                </p>
                <p className="mt-2 text-7xl font-black leading-none tracking-tight text-[var(--accent)] sm:text-8xl">
                  {showPar ? currentCase.par : (
                    <span className="text-[var(--border-muted)]">--</span>
                  )}
                </p>
              </div>
              {showCube && (
                <div
                  className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-[var(--border-subtle)]"
                  style={{ height: '160px' }}
                >
                  <CubeViewer alg={currentAlg} orientationAlg={cubeOrientationAlg} />
                </div>
              )}
            </section>

            {/* Memo + Algorithm */}
            <section
              className={['grid gap-3', algorithmStep ? 'sm:grid-cols-2' : 'grid-cols-1'].join(' ')}
            >
              <RevealPanel label="Memo" visible={showMemo} tone="warn">
                <span className="text-2xl font-bold text-[var(--warn)] sm:text-3xl">
                  {currentCase?.memo}
                </span>
              </RevealPanel>

              {algorithmStep && (
                <RevealPanel
                  label={algorithmVariants.length > 1 ? 'Algoritmos' : 'Algoritmo'}
                  visible={showAlgo}
                  tone="success"
                >
                  <AlgorithmVariants variants={algorithmVariants} />
                </RevealPanel>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── Action bar ── */}
      <div className="flex flex-col gap-2.5 border-t border-[var(--border-subtle)] px-6 py-4 sm:flex-row">
        {showRating ? (
          <>
            <button
              ref={goodButtonRef}
              type="button"
              onClick={onRateGood}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--success)] px-5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(14,158,142,0.30)] transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)]"
            >
              Bien
              <span className="text-xs font-medium text-white/60">(Space)</span>
            </button>
            <button
              type="button"
              onClick={onRateBad}
              tabIndex={-1}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-5 text-sm font-bold text-[var(--danger)] transition hover:bg-[var(--danger)] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
            >
              Mal
            </button>
            {algorithmStep && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--border-muted)] px-5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none sm:flex-none"
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
              'inline-flex h-12 flex-1 items-center justify-center rounded-2xl px-5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              canStart
                ? 'bg-[var(--accent)] text-white shadow-[0_4px_16px_rgba(62,54,176,0.30)] hover:bg-[var(--accent-mid)]'
                : 'cursor-not-allowed bg-[var(--bg-overlay)] text-[var(--text-muted)]',
            ].join(' ')}
          >
            {primaryButtonLabel(state, algorithmStep)}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Algorithm variants ────────────────────────────────────────────────────── */
function AlgorithmVariants({ variants }: { variants: string[] }) {
  if (variants.length <= 1) {
    return (
      <span className="block break-words font-mono text-base leading-7 text-[var(--success)] sm:text-lg">
        {variants[0]}
      </span>
    )
  }
  return (
    <div className="max-h-52 overflow-y-auto pr-1">
      <div className="grid gap-2">
        {variants.map((variant, index) => (
          <div
            key={`${index}-${variant}`}
            className="grid grid-cols-[1.75rem_1fr] gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2"
          >
            <span className="mt-0.5 text-xs font-semibold tabular-nums text-[var(--text-muted)]">
              {index + 1}
            </span>
            <span className="break-words font-mono text-sm leading-6 text-[var(--success)] sm:text-base">
              {variant}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Reveal panel ──────────────────────────────────────────────────────────── */
function RevealPanel({ label, visible, tone, children }: { label: string; visible: boolean; tone: 'warn' | 'success'; children: React.ReactNode }) {
  const activeBorder = tone === 'warn' ? 'border-[var(--warn-border)]'    : 'border-[var(--success-border)]'
  const activeLabel  = tone === 'warn' ? 'text-[var(--warn)]'             : 'text-[var(--success)]'
  const activeBg     = tone === 'warn' ? 'bg-[var(--warn-bg)]'            : 'bg-[var(--success-bg)]'

  return (
    <div className={[
      'rounded-2xl border p-4 transition-colors duration-200',
      visible ? [activeBorder, activeBg].join(' ') : 'border-[var(--border-subtle)] bg-[var(--bg-base)]',
    ].join(' ')}>
      <p className={['text-[10px] font-semibold uppercase tracking-[0.20em]', visible ? activeLabel : 'text-[var(--text-muted)]'].join(' ')}>
        {label}
      </p>
      <div className="mt-3">
        {visible ? (
          <div className="animate-fade-in">{children}</div>
        ) : (
          <div className="grid gap-2.5" aria-hidden="true">
            <span className="h-2.5 w-3/4 rounded-full bg-black/[0.06]" />
            <span className="h-2.5 w-1/2 rounded-full bg-black/[0.04]" />
          </div>
        )}
      </div>
    </div>
  )
}
