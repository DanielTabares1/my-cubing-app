# Product Requirements: My Cubing Tool MVP

Last updated: 2026-06-22

## Product Direction

My Cubing Tool is a local-first workspace for cubing utilities. The app is
expected to grow into multiple tools, but the current MVP ships the 3Style BLD
trainer for edges and corners.

The first screen must let the user choose which tool to open. Today, only
3Style Trainer is active; future tools may be shown as disabled placeholders.

## Non-Goals For The MVP

- No backend.
- No authentication.
- No cloud sync.
- No session history.
- No automatic CSV fetching.
- No mobile-native app shell.

## Routes

### `/`

Tool hub.

Requirements:

- Show product identity.
- Show available tools.
- Make 3Style Trainer clearly active and clickable.
- Future tools may appear disabled.
- Do not redirect directly to `/trainer`.

### `/trainer`

3Style BLD trainer for edges and corners.

Requirements:

- Use a mature dashboard-like layout.
- Keep the trainer card as the primary focus.
- Keep import, search, and status controls in a sidebar.
- Support desktop and mobile viewport widths.
- Let the user choose whether to practice edges or corners.

## Data Import

The user uploads up to three CSV files:

- **Memo matrix** (required).
- **Edge algorithm matrix** (optional).
- **Corner algorithm matrix** (optional).

At least one algorithm file is required per import.

### Matrix sizes

- Edges: **22×22** personal letter scheme.
- Corners: **21×21** personal letter scheme.
- The memo file is shared. A 22×22 memo can serve 21×21 corner algorithms when
  corner headers are a subset of the memo headers.

### Expected raw CSV shape

For an `N×N` matrix (`N` is 21 or 22):

- Row 0: ignored top-left cell, then `N` column headers.
- Rows 1–N: row header in column 0, then `N` data cells.
- Exactly `N+1` rows total in the file — no extra footer rows.

### Validation

- `N` must be 21 or 22.
- Exactly `N` row headers and `N` column headers.
- Row and column headers must be single-letter labels.
- Header labels must be unique.
- Row and column headers must use the same labels in the same order.
- Headers are normalized to uppercase during import.
- Every data row must have exactly `N+1` columns (row header + data).
- Parsed file must not contain trailing blank rows or spreadsheet notes after
  the matrix.

### Transformation

- Each algorithm matrix is imported with a piece type (`arista` or `esquina`).
- The algorithm matrix decides which cases exist for that type.
- Empty algorithm cells are skipped.
- Algorithm cells with flexible non-existent-case markers are skipped.
- Algorithm cells with line breaks are treated as multiple algorithm variants
  for the same pair.
- Memo cells may be empty; empty memo values become `Sin palabra`.
- Re-importing one piece type replaces only that type's cases and keeps the
  other type intact.

Each valid cell becomes:

```ts
interface TrainingCase {
  tipo: 'arista' | 'esquina'
  par: string
  memo: string
  algoritmo: string
  algoritmos?: string[]
}
```

### Import UI

- The CSV import panel is the primary sidebar content when no cases are loaded.
- After a successful import, hide the import panel and show status, search, and
  data management controls.
- Provide a control to reopen the import panel for updates.
- Allow dismissing the import panel without importing when cases already exist.

## Persistence

Use browser `localStorage`.

Current keys:

- `bld-trainer-cases`: flattened `TrainingCase[]`.
- `bld-trainer-prefs`: user preferences.

Preferences:

```ts
interface UserPreferences {
  timerVisible: boolean
  selectionMode: 'random' | 'sequential'
  algorithmStep: boolean
  practicePiece: 'arista' | 'esquina'
  theme: 'light' | 'dark' | 'system'
}
```

Hydration requirement:

- Any localStorage hook must avoid server/client HTML mismatches.
- Do not read localStorage in a `useState` initializer that runs during the
  first client render.
- The current hook uses `useSyncExternalStore` for this reason.
- Call sites must pass stable module-level defaults (not inline `[]` literals).

## Trainer Flow

Trainer states:

- `0`: idle.
- `1`: pair recognition.
- `2`: memo revealed.
- `3`: algorithm revealed.

Default flow:

```text
Idle -> Pair -> Memo -> Algorithm -> Next Pair
```

Solo memo flow:

```text
Idle -> Pair -> Memo -> Next Pair
```

Requirements:

- Practice only cases matching the active piece type (`practicePiece`).
- Primary button advances the current flow.
- `Space` triggers the same advance behavior.
- In algorithm mode, state `3` shows a repeat button.
- `R` repeats the same case from active states.
- Timer resets whenever a new case starts, including a case selected from
  search.
- Timer must not start when the app opens or while the trainer is idle.
- Timer displays `0.00` until a case is active.
- Switching piece type or changing the active case pool resets the session to
  idle.

## Case Search

The trainer sidebar must include a case search when cases are loaded.

Requirements:

- Search only within the active piece type.
- Search by letter pair.
- Accept lowercase input but normalize to uppercase.
- Ignore non-letter characters.
- Show partial matches while typing.
- Selecting a result starts that exact case in recognition state.
- Selecting a case should reset the visual timer.

## Sidebar Status

When cases are loaded, show separate counts for:

- edge cases,
- corner cases,
- total cases.

## UI Principles

- Dark, low-glare interface for long practice sessions.
- Trainer card anchored near the top of the main column (no vertical centering
  that forces scroll).
- No decorative marketing landing page as the main product surface.
- The first viewport should be useful.
- Controls should be explicit and compact.
- Text should not overflow buttons/cards on mobile.

## Testing And Verification

Before handing off changes:

```bash
npm run lint
npm run build
npm run test
```

At minimum, run `lint` and `build` for UI-only changes.

## Example Files

The repository includes small valid upload examples:

- `examples/sample-memos.csv`
- `examples/sample-algorithms.csv`
- `examples/sample-algorithms-corners.csv`

They should remain sparse and easy to inspect while preserving the required
matrix structure.
