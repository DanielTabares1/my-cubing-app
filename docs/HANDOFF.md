# Handoff Notes

Last updated: 2026-06-22

## Current State

The MVP is a local-first 3Style BLD trainer for edges and corners.

Completed:

- Home page is a tool selector.
- 3Style Trainer supports edges and corners.
- Shared memo CSV plus separate edge/corner algorithm CSVs.
- Strict 21×21 / 22×22 CSV validation (no trailing spreadsheet rows).
- Piece-type tagging on `TrainingCase` with merge-by-type imports.
- Header-based memo lookup for mixed matrix sizes.
- Practice toggle: Aristas / Esquinas.
- Separate sidebar counts for edges, corners, and total.
- Collapsible CSV import panel with reopen control.
- Trainer UI has a mature dark dashboard layout.
- Cases and preferences persist in `localStorage`.
- Trainer supports random and sequential modes.
- Trainer supports optional algorithm reveal.
- Multiline algorithm cells are displayed as separate algorithm variants.
- Sidebar search can jump directly to a case by letter pair.
- Timer reset behavior handles regular next-case flow and search selection.
- Hydration-safe `useLocalStorage` via `useSyncExternalStore`.
- Trainer card layout anchored near the top (no vertical centering scroll trap).

## Current Known Issues

- Several old source comments still contain mojibake from earlier generated
  text. Runtime UI has been mostly cleaned, but comments may still look odd.
- `StorageManager` has some Spanish strings with mojibake. The trainer mostly
  uses `useLocalStorage`, but those strings may surface on storage quota errors.
- `theme` exists in `UserPreferences` but no theme switcher is implemented.
- `CLAUDE.md` only points to `AGENTS.md`.

## Recent Important Changes

### Edges And Corners

- `TrainingCase.tipo` is `'arista' | 'esquina'`.
- Legacy stored cases without `tipo` are treated as edges.
- `UserPreferences.practicePiece` controls the active practice pool.
- Search and random/sequential selection operate on the active piece type only.

### CSV Import

Files per import session:

- memo (required),
- edge algorithms (optional),
- corner algorithms (optional).

At least one algorithm file is required. Imports merge by piece type.

The import panel:

- shows first when there are no cases,
- closes after a successful import,
- reopens via **Actualizar archivos CSV**,
- can be dismissed with the `×` button when cases already exist.

### Strict Matrix Validation

CSV files must be exact `N×N` grids with `N+1` rows and `N+1` columns in the
parsed file. Trailing blank rows or spreadsheet notes are rejected.

### Shared Memo Matrix

A 22×22 memo matrix can serve 21×21 corner algorithms when corner headers exist
in the memo matrix.

### Solo Memo Mode

`UserPreferences.algorithmStep` controls whether the algorithm reveal step is
included.

### Case Search

`CaseSearch` lives inside `app/trainer/page.tsx` and filters by active piece
type.

### Multiline Algorithm Variants

Algorithm CSV cells may contain line breaks. These are interpreted as variants
for the same case, not as separate cases.

### Session Reset Fixes

- `useTrainerState` resets on piece-type or case-count changes, not on array
  reference churn.
- `useLocalStorage` callers must use stable default constants to avoid
  accidental session resets.

## Suggested Next Tasks

High value:

- Remove mojibake from source comments and storage error strings.
- Add tests for:
  - `practicePiece` filtering,
  - collapsible import panel behavior,
  - `mergeCasesByType`.
- Split `CaseSearch`, `Metric`, and `PracticePieceToggle` out of
  `app/trainer/page.tsx` if the page grows further.

Medium value:

- Show skipped-cell count in import summary.
- Exact-match prioritization in search for long result lists.
- Case subsets or custom practice filters.

Avoid unless explicitly requested:

- Backend/database work.
- Auth.
- Cloud sync.
- New styling framework.
- Major route restructuring.

## Fast Orientation For A New Agent

Read in this order:

1. `AGENTS.md`
2. `README.md`
3. `requirements.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DATA_MODEL.md`
6. `docs/DEVELOPMENT.md`
7. The files relevant to the task.

Run:

```bash
npm run lint
npm run build
```

Run tests if touching logic:

```bash
npm run test
```
