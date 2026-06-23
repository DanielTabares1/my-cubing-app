# Architecture

Last updated: 2026-06-23

## Overview

My Cubing Tool is a Next.js App Router project with a local-first client-side
data model. It currently has two public routes:

- `/`: tool hub.
- `/trainer`: 3Style BLD edge trainer.

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

- `CSVImporter`: imports and validates CSVs, then emits `TrainingCase[]`.
- `TrainerCard`: presentational practice card.
- `VisualTimer`: case timer.
- `CaseSearch`: local component for searching by letter pair.
- `Metric`: local component for sidebar status counters.

The page is also responsible for:

- Persisted cases and preferences.
- Timer reset token.
- Error banner.
- Header controls.
- Passing the correct advance handler to `TrainerCard`.

## Core Hooks

### `useLocalStorage`

Hydration-safe persisted state hook.

- Uses `useSyncExternalStore`.
- Server snapshot is `null`.
- First hydration render matches server HTML.
- Browser snapshot reads the raw `localStorage` string.
- Writes dispatch a custom `local-storage:${key}` event so same-tab subscribers
  update immediately.

Use this hook for persisted UI state. Avoid ad hoc `localStorage` reads in
render or `useState` initializers.

### `useTrainerState`

State machine for practice.

Inputs:

- `cases`
- `selectionMode`
- `algorithmStep`

Returns:

- `state`
- `currentCase`
- `advance`
- `reset`
- `startPractice`
- `practiceCase`

States:

- `0`: idle.
- `1`: recognition.
- `2`: memo revealed.
- `3`: algorithm revealed.

If `algorithmStep` is false, advancing from state `2` selects the next case
instead of entering state `3`.

### `useCaseSelection`

Selects next case randomly or sequentially.

### `useKeyboardShortcuts`

Global keyboard handler while the trainer is active.

- `Space`: advance.
- `R`: reset/repeat.
- Skips input and textarea targets.

## Data Flow

```text
CSV files
  -> CSVImporter
  -> parseCSVFile
  -> validateMatrixStructure
  -> transformMatrices
  -> TrainingCase[]
  -> localStorage + React state
  -> TrainerCard / CaseSearch
```

## Timer Flow

`VisualTimer` does not decide which case is active. The page flips a boolean
`timerResetToken` whenever a new recognition state starts or the selected case
changes. `VisualTimer` restarts its animation loop whenever that token changes.

This matters for search: selecting a case while already in state `1` still
resets the timer because the current pair changed.

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

