'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PieceType, TrainingCase, UserPreferences } from '@/app/lib/types'
import { StorageManager } from '@/app/lib/storage-manager'
import { caseKey, countCasesByType, filterCasesByPiece, normalizeTrainingCases } from '@/app/lib/training-cases'
import { applyCaseRating, toggleCaseLearned, updateCaseInArray } from '@/app/lib/case-progress'
import { useLocalStorage } from '@/app/hooks/useLocalStorage'
import { useTrainerState } from '@/app/hooks/useTrainerState'
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts'
import {
  CUBE_COLORS, CUBE_ORIENTATION_PRESETS, areOpposite,
  isInvalidOrientation, getOrientationRotationAlg, type CubeColor,
} from '@/app/lib/cube-orientation'
import CSVImporter from '@/app/components/CSVImporter'
import TrainerCard from '@/app/components/TrainerCard'
import VisualTimer from '@/app/components/VisualTimer'
import { useTheme } from '@/app/hooks/useTheme'

const DEFAULT_PREFS: UserPreferences = {
  timerVisible: true,
  selectionMode: 'random',
  algorithmStep: true,
  practicePiece: 'arista',
  theme: 'dark',
  cubeVisible: false,
  cubeOrientation: 'YG',
}

const EMPTY_TRAINING_CASES: TrainingCase[] = []

export default function TrainerPage() {
  const [cases, setCases] = useLocalStorage<TrainingCase[]>('bld-trainer-cases', EMPTY_TRAINING_CASES)
  const [prefs, setPrefs] = useLocalStorage<UserPreferences>('bld-trainer-prefs', DEFAULT_PREFS)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [importPanelOpen, setImportPanelOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const { isDark, toggleTheme } = useTheme()
  const CONFIRM_PHRASE = 'borrar'

  const algorithmStep = prefs.algorithmStep ?? DEFAULT_PREFS.algorithmStep
  const practicePiece = prefs.practicePiece ?? DEFAULT_PREFS.practicePiece
  const cubeVisible   = prefs.cubeVisible   ?? DEFAULT_PREFS.cubeVisible
  const cubeOrientation = prefs.cubeOrientation ?? DEFAULT_PREFS.cubeOrientation
  const cubeOrientationAlg = getOrientationRotationAlg(cubeOrientation)

  const normalizedCases = useMemo(() => normalizeTrainingCases(cases), [cases])
  const hasCases   = normalizedCases.length > 0
  const showImportPanel = !hasCases || importPanelOpen
  const caseCounts = useMemo(() => countCasesByType(normalizedCases), [normalizedCases])
  const practiceCases = useMemo(
    () => filterCasesByPiece(normalizedCases, practicePiece),
    [normalizedCases, practicePiece],
  )

  const { state, currentCase, advance, reset, startPractice, practiceCase, catalogStats, roundStats } =
    useTrainerState(practiceCases, prefs.selectionMode, algorithmStep, practicePiece)

  const displayCase = useMemo(() => {
    if (!currentCase) return null
    return practiceCases.find((c) => caseKey(c) === caseKey(currentCase)) ?? currentCase
  }, [currentCase, practiceCases])

  const atRatingStage = displayCase !== null && (algorithmStep ? state === 3 : state === 2)

  const prevStateRef = useRef(state)
  const prevCaseRef  = useRef<string | null>(null)
  const [timerResetToken, setTimerResetToken] = useState(false)

  useEffect(() => {
    const par = currentCase?.par ?? null
    if (state === 1 && (prevStateRef.current !== 1 || prevCaseRef.current !== par)) {
      setTimerResetToken((v) => !v)
    }
    prevStateRef.current = state
    prevCaseRef.current  = par
  }, [state, currentCase])

  // Close settings dropdown on outside click
  useEffect(() => {
    if (!settingsOpen) return
    const handle = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [settingsOpen])

  // Close bottom sheet when escape is pressed
  useEffect(() => {
    if (!bottomSheetOpen) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') setBottomSheetOpen(false) }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [bottomSheetOpen])

  const persistCaseUpdate = useCallback(
    (updater: (c: TrainingCase) => TrainingCase) => {
      if (!displayCase) return
      setCases((prev) => updateCaseInArray(prev, caseKey(displayCase), updater))
    },
    [displayCase, setCases],
  )

  const handleRateGood = useCallback(() => {
    persistCaseUpdate((c) => applyCaseRating(c, 'good'))
    advance()
  }, [persistCaseUpdate, advance])

  const handleRateBad = useCallback(() => {
    persistCaseUpdate((c) => applyCaseRating(c, 'bad'))
    advance()
  }, [persistCaseUpdate, advance])

  useKeyboardShortcuts({
    onAdvance: atRatingStage ? handleRateGood : advance,
    onReset: reset,
    enabled: state > 0,
    resetEnabled: !atRatingStage || algorithmStep,
  })

  const handleToggleLearned = useCallback(() => persistCaseUpdate(toggleCaseLearned), [persistCaseUpdate])

  const handleImportComplete = useCallback((newCases: TrainingCase[]) => {
    try { StorageManager.saveTrainingCases(newCases) } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudieron guardar los casos.'
      setErrorMessage(msg)
      console.error('TrainerPage: saveTrainingCases failed:', err)
    }
    setCases(newCases)
    setErrorMessage(null)
    setImportPanelOpen(false)
  }, [setCases])

  const handleError         = useCallback((msg: string) => setErrorMessage(msg), [])
  const handleClearData     = useCallback(() => { StorageManager.clearTrainingCases(); setCases([]); setErrorMessage(null); setImportPanelOpen(true) }, [setCases])
  const handleConfirmClear  = useCallback(() => { setConfirmClearOpen(false); setConfirmText(''); handleClearData() }, [handleClearData])
  const handleCancelClear   = useCallback(() => { setConfirmClearOpen(false); setConfirmText('') }, [])

  const handleToggleTimerVisibility = useCallback(() => setPrefs((p) => ({ ...p, timerVisible: !p.timerVisible })), [setPrefs])
  const handleToggleSelectionMode   = useCallback(() => setPrefs((p) => ({ ...p, selectionMode: p.selectionMode === 'random' ? 'sequential' : 'random' })), [setPrefs])
  const handleToggleAlgorithmStep   = useCallback(() => setPrefs((p) => ({ ...p, algorithmStep: !(p.algorithmStep ?? DEFAULT_PREFS.algorithmStep) })), [setPrefs])
  const handlePracticePieceChange   = useCallback((piece: PieceType) => setPrefs((p) => ({ ...p, practicePiece: piece })), [setPrefs])
  const handleToggleCubeVisible     = useCallback(() => setPrefs((p) => ({ ...p, cubeVisible: !p.cubeVisible })), [setPrefs])
  const handleCubeOrientationChange = useCallback((id: string) => setPrefs((p) => ({ ...p, cubeOrientation: id })), [setPrefs])

  // Derived summary values for the bottom bar
  const roundSummary = roundStats
    ? `${roundStats.completed}/${roundStats.roundSize}`
    : null
  const pct = roundStats && roundStats.roundSize > 0
    ? Math.round((roundStats.completed / roundStats.roundSize) * 100)
    : 0

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">

      {/* ════════════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR  (lg+)
      ════════════════════════════════════════════════════════════════════════ */}
      <aside className="hidden w-64 shrink-0 flex-col bg-[var(--bg-sidebar)] lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6">
          <span className="grid size-8 place-items-center rounded-xl bg-white/15 text-xs font-black text-white">M</span>
          <span className="text-sm font-semibold text-white">My Cubing Tool</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 pt-2" aria-label="Navegación principal">
          <Link
            href="/"
            className="flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <IconHome />
            Inicio
          </Link>
          <div className="flex h-11 items-center gap-3 rounded-xl bg-white/15 px-4 text-sm font-semibold text-white" aria-current="page">
            <IconGrid />
            3Style Trainer
          </div>
        </nav>

        {/* Panels */}
        <div className="mt-6 flex flex-col gap-3 overflow-y-auto px-3 pb-6">
          {showImportPanel ? (
            <div className="rounded-2xl bg-white/10 p-3">
              <CSVImporter
                existingCases={normalizedCases}
                onImportComplete={handleImportComplete}
                onError={handleError}
                onDismiss={hasCases ? () => setImportPanelOpen(false) : undefined}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setImportPanelOpen(true)}
              className="flex h-11 w-full items-center gap-3 rounded-xl bg-white/10 px-4 text-sm font-medium text-white/80 transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <span className="grid size-6 place-items-center rounded-lg bg-white/15 text-[9px] font-bold text-white">CSV</span>
              Actualizar CSV
            </button>
          )}

          {hasCases && (
            <SidebarAccordion title="Estado" defaultOpen>
              <div className="grid grid-cols-2 gap-2 pb-2 pt-1">
                <StatTile label="Aristas"      value={caseCounts.aristas.toString()} />
                <StatTile label="Esquinas"     value={caseCounts.esquinas.toString()} />
                <StatTile label="Total"        value={caseCounts.total.toString()} />
                <StatTile label="Aprendidos"   value={`${catalogStats.learned}/${catalogStats.total}`} accent />
                <StatTile label="Por aprender" value={catalogStats.unlearned.toString()} />
                <StatTile label="Modo"         value={prefs.selectionMode === 'random' ? 'Mix' : 'Seq'} />
              </div>
            </SidebarAccordion>
          )}

          {hasCases && (
            <SidebarAccordion title="Buscar caso">
              <div className="pb-2 pt-1">
                <CaseSearch cases={practiceCases} currentCase={currentCase} onSelectCase={practiceCase} />
              </div>
            </SidebarAccordion>
          )}

          {hasCases && (
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="flex h-10 w-full items-center gap-2 rounded-xl px-4 text-sm font-medium text-white/40 transition hover:bg-white/10 hover:text-[#ff8aab] focus:outline-none"
            >
              <IconTrash />
              Borrar datos
            </button>
          )}
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-4 backdrop-blur-md sm:px-6">
          <Link
            href="/"
            className="grid size-9 place-items-center rounded-xl border border-[var(--border-muted)] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hidden"
            aria-label="Volver"
          >
            <IconChevronLeft />
          </Link>

          <span className="mr-auto text-sm font-semibold text-[var(--text-primary)] lg:hidden">
            3Style Trainer
          </span>

          <PracticePieceToggle
            value={practicePiece}
            onChange={handlePracticePieceChange}
            edgeCount={caseCounts.aristas}
            cornerCount={caseCounts.esquinas}
          />

          <VisualTimer
            isVisible={prefs.timerVisible}
            isRunning={state > 0 && currentCase !== null}
            onToggleVisibility={handleToggleTimerVisibility}
            shouldReset={timerResetToken}
          />

          {/* Settings dropdown */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
              aria-label="Configuración"
              className={[
                'grid size-9 place-items-center rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                settingsOpen
                  ? 'border-[var(--accent)] bg-[var(--accent-lavender)] text-[var(--accent)]'
                  : 'border-[var(--border-muted)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
              ].join(' ')}
            >
              <IconSettings />
            </button>

            {settingsOpen && (
              <div
                className="animate-slide-down absolute right-0 top-11 z-30 w-72 overflow-hidden rounded-2xl bg-[var(--bg-surface)]"
                style={{ boxShadow: 'var(--shadow-dropdown)' }}
              >
                <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Configuración</p>
                </div>
                <div className="space-y-0.5 p-2">
                  <SettingsRow label="Modo selección" value={prefs.selectionMode === 'random' ? 'Aleatorio' : 'Secuencial'} onClick={handleToggleSelectionMode} active={false} />
                  <SettingsRow label="Paso algoritmo" value={algorithmStep ? 'Memo + Alg' : 'Solo memo'} onClick={handleToggleAlgorithmStep} active={algorithmStep} />
                  <SettingsRow label="Cubo 3D"        value={cubeVisible ? 'Visible' : 'Oculto'}          onClick={handleToggleCubeVisible}     active={cubeVisible} />
                  <ThemeToggleRow isDark={isDark} onToggle={toggleTheme} />
                </div>
                {cubeVisible && (
                  <div className="border-t border-[var(--border-subtle)] px-4 pb-4 pt-3">
                    <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Orientación del cubo</p>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {CUBE_ORIENTATION_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleCubeOrientationChange(preset.id)}
                          aria-pressed={cubeOrientation === preset.id}
                          className={[
                            'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition focus:outline-none',
                            cubeOrientation === preset.id
                              ? 'border-[var(--accent)] bg-[var(--accent-lavender)] text-[var(--accent)]'
                              : 'border-[var(--border-muted)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
                          ].join(' ')}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <CubeOrientationPickers cubeOrientation={cubeOrientation} onCubeOrientationChange={handleCubeOrientationChange} />
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Error banner */}
        {errorMessage && (
          <div className="mx-4 mt-4 sm:mx-6" role="alert">
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
              <span>{errorMessage}</span>
              <button type="button" onClick={() => setErrorMessage(null)} className="grid size-6 shrink-0 place-items-center rounded-lg hover:bg-[var(--danger-bg)] focus:outline-none" aria-label="Cerrar error">✕</button>
            </div>
          </div>
        )}

        {/* Practice area — bottom padding on mobile to clear the bottom bar */}
        <main className="flex flex-1 items-start justify-center px-4 py-6 pb-28 sm:px-6 lg:pb-6">
          <TrainerCard
            state={state}
            currentCase={displayCase}
            onAdvance={state === 0 ? startPractice : advance}
            onReset={reset}
            onRateGood={handleRateGood}
            onRateBad={handleRateBad}
            onToggleLearned={handleToggleLearned}
            totalCases={practiceCases.length}
            algorithmStep={algorithmStep}
            roundStats={roundStats}
            cubeVisible={cubeVisible}
            cubeOrientationAlg={cubeOrientationAlg}
          />
        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MOBILE BOTTOM SHEET  (hidden on lg+)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">

        {/* Backdrop when expanded */}
        {bottomSheetOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setBottomSheetOpen(false)}
          />
        )}

        {/* Sheet */}
        <div
          className={[
            'relative mx-auto max-w-lg overflow-hidden rounded-t-3xl bg-[var(--bg-sidebar)] transition-all duration-300 ease-out',
            bottomSheetOpen ? 'shadow-[0_-8px_40px_rgba(62,54,176,0.30)]' : 'shadow-[0_-4px_20px_rgba(62,54,176,0.15)]',
          ].join(' ')}
        >
          {/* ── Always-visible summary bar ── */}
          <button
            type="button"
            onClick={() => setBottomSheetOpen((v) => !v)}
            aria-expanded={bottomSheetOpen}
            aria-label={bottomSheetOpen ? 'Colapsar panel' : 'Expandir panel'}
            className="flex w-full flex-col gap-2 px-5 pb-3 pt-3 focus:outline-none"
          >
            {/* Drag handle */}
            <span className="mx-auto block h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />

            <div className="flex items-center gap-3">
              {/* Piece badge */}
              <span className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
                {practicePiece === 'arista' ? 'Aristas' : 'Esquinas'}
                <span className="ml-1.5 text-white/50">
                  {practicePiece === 'arista' ? caseCounts.aristas : caseCounts.esquinas}
                </span>
              </span>

              {/* Round progress pill */}
              {roundSummary ? (
                <span className="flex items-center gap-2 rounded-xl bg-[var(--accent-lavender)]/15 px-3 py-1.5 text-xs font-semibold text-white">
                  <span className="size-1.5 rounded-full bg-[var(--accent-sky)]" aria-hidden="true" />
                  Ronda {roundSummary}
                  <span className="text-white/50">{pct}%</span>
                </span>
              ) : (
                <span className="text-xs text-white/40">Sin práctica activa</span>
              )}

              {/* Learned */}
              {hasCases && (
                <span className="ml-auto rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70">
                  <span className="font-bold text-[var(--accent-sky)]">{catalogStats.learned}</span>
                  <span className="text-white/40">/{catalogStats.total}</span>
                  <span className="ml-1 text-white/40">apr.</span>
                </span>
              )}

              {/* Chevron */}
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                aria-hidden="true"
                className={['ml-1 shrink-0 text-white/40 transition-transform duration-300', bottomSheetOpen ? 'rotate-180' : ''].join(' ')}
              >
                <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Mini progress bar */}
            {roundStats && roundStats.roundSize > 0 && (
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, var(--accent-sky) 0%, #b9dddf 100%)',
                  }}
                />
              </div>
            )}
          </button>

          {/* ── Expanded panel content ── */}
          {bottomSheetOpen && (
            <div className="animate-slide-up max-h-[65vh] overflow-y-auto border-t border-white/10 px-4 pb-6 pt-4">
              {/* Import */}
              {showImportPanel ? (
                <div className="mb-4 rounded-2xl bg-white/10 p-3">
                  <CSVImporter
                    existingCases={normalizedCases}
                    onImportComplete={handleImportComplete}
                    onError={handleError}
                    onDismiss={hasCases ? () => setImportPanelOpen(false) : undefined}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setImportPanelOpen(true)}
                  className="mb-4 flex h-11 w-full items-center gap-3 rounded-xl bg-white/10 px-4 text-sm font-medium text-white/80 transition hover:bg-white/20 hover:text-white focus:outline-none"
                >
                  <span className="grid size-6 place-items-center rounded-lg bg-white/15 text-[9px] font-bold text-white">CSV</span>
                  Actualizar CSV
                </button>
              )}

              {hasCases && (
                <>
                  {/* Stats grid */}
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Estado</p>
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    <StatTile label="Aristas"    value={caseCounts.aristas.toString()} />
                    <StatTile label="Esquinas"   value={caseCounts.esquinas.toString()} />
                    <StatTile label="Total"      value={caseCounts.total.toString()} />
                    <StatTile label="Aprendidos" value={`${catalogStats.learned}/${catalogStats.total}`} accent />
                    <StatTile label="Por aprender" value={catalogStats.unlearned.toString()} />
                    <StatTile label="Modo"       value={prefs.selectionMode === 'random' ? 'Mix' : 'Seq'} />
                  </div>

                  {/* Case search */}
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Buscar caso</p>
                  <CaseSearch
                    cases={practiceCases}
                    currentCase={currentCase}
                    onSelectCase={(c) => { practiceCase(c); setBottomSheetOpen(false) }}
                  />

                  {/* Danger */}
                  <button
                    type="button"
                    onClick={() => { setBottomSheetOpen(false); setConfirmClearOpen(true) }}
                    className="mt-4 flex h-10 w-full items-center gap-2 rounded-xl px-4 text-sm font-medium text-white/30 transition hover:bg-white/10 hover:text-[#ff8aab] focus:outline-none"
                  >
                    <IconTrash />
                    Borrar datos
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          CONFIRM CLEAR MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="animate-scale-in w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] p-6" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
            <p className="text-base font-semibold text-[var(--text-primary)]">Borrar todos los datos</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Esta acción no se puede deshacer. Escribe{' '}
              <span className="font-mono font-semibold text-[var(--text-primary)]">{CONFIRM_PHRASE}</span>{' '}
              para confirmar.
            </p>
            <input
              type="text"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && confirmText.toLowerCase() === CONFIRM_PHRASE) handleConfirmClear()
                if (e.key === 'Escape') handleCancelClear()
              }}
              placeholder={CONFIRM_PHRASE}
              className="mt-4 h-11 w-full rounded-xl border border-[var(--border-muted)] bg-[var(--bg-base)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger-bg)]"
            />
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={handleConfirmClear} disabled={confirmText.toLowerCase() !== CONFIRM_PHRASE}
                className="flex-1 rounded-xl bg-[var(--danger)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none">
                Borrar
              </button>
              <button type="button" onClick={handleCancelClear}
                className="flex-1 rounded-xl border border-[var(--border-muted)] py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
══════════════════════════════════════════════════════════════════════════════ */

function SidebarAccordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-xl bg-white/10">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex h-10 w-full items-center justify-between px-4 text-sm font-semibold text-white/80 transition hover:text-white focus:outline-none">
        {title}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
          className={['transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="animate-slide-down border-t border-white/10 px-3">
          {children}
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-[10px] font-medium text-white/50">{label}</p>
      <p className={['mt-0.5 text-lg font-bold tabular-nums', accent ? 'text-[var(--accent-sky)]' : 'text-white'].join(' ')}>
        {value}
      </p>
    </div>
  )
}

function SettingsRow({ label, value, onClick, active }: { label: string; value: string; onClick: () => void; active: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-[var(--bg-overlay)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
      <span className="font-medium text-[var(--text-primary)]">{label}</span>
      <span className="flex items-center gap-2 text-[var(--text-secondary)]">
        {active && <span className="size-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />}
        <span className="text-xs">{value}</span>
      </span>
    </button>
  )
}

function PracticePieceToggle({ value, onChange, edgeCount, cornerCount }: { value: PieceType; onChange: (p: PieceType) => void; edgeCount: number; cornerCount: number }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-[var(--border-muted)] bg-[var(--bg-surface)] p-1" role="group" aria-label="Tipo de pieza">
      <PieceBtn label="Aristas"  count={edgeCount}   isActive={value === 'arista'}  onClick={() => onChange('arista')} />
      <PieceBtn label="Esquinas" count={cornerCount}  isActive={value === 'esquina'} onClick={() => onChange('esquina')} />
    </div>
  )
}

function PieceBtn({ label, count, isActive, onClick }: { label: string; count: number; isActive: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={count === 0} aria-pressed={isActive}
      className={[
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40',
        isActive ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--accent)]',
      ].join(' ')}>
      {label}
      <span className={['tabular-nums text-[10px]', isActive ? 'text-white/70' : 'text-[var(--text-muted)]'].join(' ')}>{count}</span>
    </button>
  )
}

function CubeOrientationPickers({ cubeOrientation, onCubeOrientationChange }: { cubeOrientation: string; onCubeOrientationChange: (id: string) => void }) {
  const top = cubeOrientation[0] ?? 'W'
  const front = cubeOrientation[1] ?? 'G'
  const invalid = isInvalidOrientation(top, front)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <ColorPicker label="Arriba" value={top}   disabledColor={front} onChange={(c) => onCubeOrientationChange(c + front)} />
        <ColorPicker label="Frente" value={front} disabledColor={top}   onChange={(c) => onCubeOrientationChange(top + c)} />
      </div>
      {invalid && <p className="text-[11px] text-[var(--danger)]">Los colores no pueden ser iguales ni opuestos.</p>}
    </div>
  )
}

const COLOR_SWATCHES: Record<string, string> = {
  W: 'bg-white border-stone-300',
  Y: 'bg-yellow-400 border-yellow-200',
  G: 'bg-green-500 border-green-300',
  B: 'bg-blue-500 border-blue-300',
  R: 'bg-red-500 border-red-300',
  O: 'bg-orange-500 border-orange-300',
}

function ColorPicker({ label, value, disabledColor, onChange }: { label: string; value: string; disabledColor: string; onChange: (c: CubeColor) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
      <div className="flex flex-wrap gap-1">
        {CUBE_COLORS.map((color) => {
          const isDisabled = color.code === disabledColor || areOpposite(color.code, disabledColor)
          return (
            <button key={color.code} type="button" onClick={() => !isDisabled && onChange(color.code)}
              disabled={isDisabled} aria-pressed={value === color.code} aria-label={color.label}
              className={[
                'size-6 rounded-full border-2 transition focus:outline-none',
                COLOR_SWATCHES[color.code] ?? 'bg-stone-500 border-stone-300',
                value === color.code ? 'ring-2 ring-[var(--accent)] ring-offset-1' : '',
                isDisabled ? 'cursor-not-allowed opacity-25' : '',
              ].join(' ')}
            />
          )
        })}
      </div>
    </div>
  )
}

function CaseSearch({ cases, currentCase, onSelectCase }: { cases: TrainingCase[]; currentCase: TrainingCase | null; onSelectCase: (c: TrainingCase) => void }) {
  const [query, setQuery] = useState('')
  const nq = query.trim().toUpperCase()
  const matches = useMemo(() => {
    if (!nq) return []
    return cases.filter((c) => c.par.toUpperCase().startsWith(nq)).slice(0, 8)
  }, [cases, nq])

  return (
    <div>
      <div className="flex gap-2">
        <input type="text" value={query} maxLength={2} disabled={cases.length === 0}
          onChange={(e) => setQuery(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())}
          placeholder="AB"
          className="h-9 min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-bold uppercase tracking-[0.18em] text-white outline-none transition placeholder:text-white/30 focus:border-white/50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Buscar caso"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')}
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white focus:outline-none">
            ✕
          </button>
        )}
      </div>

      {cases.length > 0 && !nq && <p className="mt-2 text-xs text-white/40">Escribe una pareja de letras.</p>}
      {nq && matches.length === 0 && <p className="mt-2 text-xs text-white/40">Sin resultados para {nq}.</p>}

      {matches.length > 0 && (
        <div className="mt-2 grid gap-1">
          {matches.map((tc) => {
            const isActive = currentCase !== null && caseKey(tc) === caseKey(currentCase)
            return (
              <button key={caseKey(tc)} type="button" onClick={() => onSelectCase(tc)}
                className={[
                  'flex h-10 items-center justify-between gap-2 rounded-xl px-3 text-sm transition focus:outline-none',
                  isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
                ].join(' ')}>
                <span className="font-mono text-sm font-bold tracking-[0.14em]">{tc.par}</span>
                <span className="min-w-0 flex-1 truncate text-xs opacity-60">{tc.memo}</span>
                {tc.isLearned && (
                  <span className="shrink-0 rounded-full bg-[var(--success-light)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--success-light)]">OK</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Theme toggle row ─────────────────────────────────────────────────────── */
function ThemeToggleRow({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-[var(--bg-overlay)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      <span className="font-medium text-[var(--text-primary)]">Tema</span>
      <span className="flex items-center gap-2">
        {/* Toggle track */}
        <span
          className={[
            'relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200',
            isDark
              ? 'border-[var(--accent)] bg-[var(--accent)]'
              : 'border-[var(--border-muted)] bg-[var(--bg-overlay)]',
          ].join(' ')}
          aria-hidden="true"
        >
          {/* Knob */}
          <span
            className={[
              'absolute flex size-4 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200',
              isDark ? 'translate-x-5' : 'translate-x-0.5',
            ].join(' ')}
          >
            {isDark ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1.5a3.5 3.5 0 1 0 3.5 3.5A3.5 3.5 0 0 0 5 5a3.5 3.5 0 0 1-3.5-3.5A3.47 3.47 0 0 1 5 1.5Z" fill="#3e36b0"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="2" fill="#d97706"/>
                <path d="M5 1V0M5 10V9M1 5H0M10 5H9M2.1 2.1L1.4 1.4M8.6 8.6l-.7-.7M7.9 2.1l.7-.7M2.1 7.9l-.7.7" stroke="#d97706" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            )}
          </span>
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {isDark ? 'Oscuro' : 'Claro'}
        </span>
      </span>
    </button>
  )
}

/* ── Icon helpers ─────────────────────────────────────────────────────────── */
function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 6.5L8 2l6 4.5V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}
function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9.5" y="1.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1.5" y="9.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )
}
function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M12.5 7.5h.5m-11 0H1.5m5-6v.5m0 11v.5M3.4 3.4l.35.35m7.5 7.5.35.35M3.4 11.6l.35-.35m7.5-7.5.35-.35" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 3h9M5 3V2h3v1M4 3l.5 7.5h4L9 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
