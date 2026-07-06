# Architecture

Last updated: 2026-07-06

## Overview

My Cubing Tool is a Next.js App Router project with a local-first client-side
data model. It currently has two public routes:

- `/`: tool hub.
- `/trainer`: 3Style BLD trainer for edges and corners.

The app has no backend. Runtime data comes from uploaded CSV files and
`localStorage`.

## Route Structure

```text
app/
  page.tsx              Tool hub
  trainer/page.tsx      Trainer orchestration page
  layout.tsx            Root layout and metadata
  globals.css           Tailwind import and global theme
```

## Trainer Composition

`app/trainer/page.tsx` owns page-level state and wires together:

- `CSVImporter`: imports memo plus optional edge/corner algorithm CSVs.
- `TrainerCard`: presentational practice card with `RoundProgress` during active practice.
- `VisualTimer`: case timer.
- `CaseSearch`: local component for searching by letter pair.
- `Metric`: local component for sidebar status counters.
- `PracticePieceToggle`: edge/corner practice filter in the header.

The page is also responsible for:

- Persisted cases and preferences.
- Collapsible import panel visibility.
- Filtering practice cases by `practicePiece`.
- Timer reset token.
- Error banner.
- Header controls.
- Post-case rating handlers (`Bien` / `Mal`) that update `streak` and persist.
- Learned-toggle handler that flips `isLearned`.

`TrainerCard` shows a rating stage after the final reveal step (memo in solo
memo mode, algorithm in full mode). **Bien** is auto-focused; `Space` confirms
**Bien**. **Mal** requires an explicit click.

When cases exist, sidebar **Estado** includes catalog mastery counts for the
active piece type. During practice, the card header area shows live round
progress below the badge row.

## Sidebar Behavior

When no cases are loaded:

- Only the CSV import panel is shown.

When cases exist and the import panel is closed:

- **Actualizar archivos CSV** reopens import.
- Status metrics show edge, corner, total, and catalog mastery counts
  (`Aprendidos`, `Por aprender`) for the active piece type.
- Case search and clear-data controls are available.

After a successful import, the import panel closes automatically.

## Core Hooks

### `useLocalStorage`

Hydration-safe persisted state hook.

- Uses `useSyncExternalStore`.
- Server snapshot is `null`.
- First hydration render matches server HTML.
- Browser snapshot reads the raw `localStorage` string.
- Writes dispatch a custom `local-storage:${key}` event so same-tab subscribers
  update immediately.
- Call sites should pass stable module-level defaults.

### `useTrainerState`

State machine for practice.

Inputs:

- `cases` (already filtered to the active piece type)
- `selectionMode`
- `algorithmStep`
- `practicePiece`

Returns:

- `state`
- `currentCase`
- `advance`
- `reset`
- `startPractice`
- `practiceCase`
- `catalogStats`
- `roundStats`

States:

- `0`: idle.
- `1`: recognition.
- `2`: memo revealed.
- `3`: algorithm revealed.

If `algorithmStep` is false, advancing from state `2` selects the next case
instead of entering state `3`.

The hook resets to idle when `practicePiece` or the filtered case count changes.

### `useCaseSelection`

Selects next case randomly or sequentially from a spaced-repetition session pool.

- Calls `buildSessionPool()` before shuffling or cycling.
- `'random'`: shuffled playlist over the current pool; no repeats until every
  pool case has been shown once, then a new pool and shuffle start.
- `'sequential'`: returns cases in session-pool order, cycling from the start.
- `notifyCasePracticed()` removes a manually chosen case from the remaining
  shuffled round.
- Exposes `catalogStats` and `roundStats` for the UI.

### Round progress modules

```text
app/lib/round-stats.ts     getCatalogStats, getRoundStats, partitionSessionPool
app/components/RoundProgress.tsx
```

`catalogStats` covers the full active practice set. `roundStats` tracks the
current pool round: size, completed, remaining, and nuevos/repaso split. Round
composition is fixed until the shuffle playlist completes and a new pool is
built.

### Spaced repetition modules

```text
app/lib/session-pool.ts   buildSessionPool, getLearnedInclusionProbability
app/lib/case-progress.ts  applyCaseRating, toggleCaseLearned, updateCaseInArray
```

See `docs/DATA_MODEL.md` for inclusion probabilities and streak rules.

### `useKeyboardShortcuts`

Global keyboard handler while the trainer is active.

- `Space`: advance; at the rating stage confirms **Bien**.
- `R`: reset/repeat when enabled (full algorithm mode during rating).
- Skips input, textarea, and focused button targets.

## Data Flow

```text
Memo CSV + optional edge/corner algo CSVs
  -> CSVImporter
  -> parseCSVFile
  -> validateMatrixStructure
  -> validateMemoCoversAlgo
  -> transformMatrices(pieceType)
  -> mergeCasesByType
  -> TrainingCase[]
  -> localStorage + React state
  -> filterCasesByPiece(practicePiece)
  -> buildSessionPool (spaced repetition)
  -> useCaseSelection (shuffle / sequential)
  -> TrainerCard / CaseSearch
```

## Timer Flow

`VisualTimer` does not decide which case is active. The page flips a boolean
`timerResetToken` whenever a new recognition state starts or the selected case
changes. `VisualTimer` restarts its animation loop whenever that token changes.
The timer only runs when `isRunning` is true, which currently means the trainer
has an active case. In idle state it displays `0.00` and does not schedule
animation frames.

## Layout Notes

- The trainer card column uses `self-start` so the card stays near the top.
- The import panel is the first sidebar block when visible.
- `TrainerCard` uses a compact natural-height layout during active practice.

## Styling

- Tailwind CSS v4 is used through `@import "tailwindcss"` in `globals.css`.
- UI uses a dark stone/cyan/emerald palette.
- Avoid adding single-purpose global CSS unless Tailwind cannot express it.
- Keep interactive controls stable in size to avoid layout shifts.

## Next.js Notes

Next.js version is `16.2.9`. Local docs are available in:

```text
node_modules/next/dist/docs/
```

For route files and Link behavior, see:

```text
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md
```
