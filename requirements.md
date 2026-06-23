# Product Requirements: My Cubing Tool MVP

Last updated: 2026-06-23

## Product Direction

My Cubing Tool is a local-first workspace for cubing utilities. The app is
expected to grow into multiple tools, but the current MVP only ships the 3Style
BLD edge trainer.

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

3Style BLD edge trainer.

Requirements:

- Use a mature dashboard-like layout.
- Keep the trainer card as the primary focus.
- Keep import, search, and status controls in a sidebar.
- Support desktop and mobile viewport widths.

## Data Import

The user uploads two CSV files:

- Algorithm matrix.
- Memo matrix.

Both files must be 22x22 matrices using letters `A` through `V`.

Expected raw CSV shape:

- Row 0: ignored top-left cell, then column headers `A` through `V`.
- Rows 1-22: row header in column 0, then 22 data cells.

Validation:

- Exactly 22 row headers are expected.
- Exactly 22 column headers are expected.
- Row and column headers must be `A` through `V`, in order.
- Every data row must have 22 columns.

Transformation:

- The algorithm matrix decides which cases exist.
- Empty algorithm cells are skipped.
- Algorithm cells equal to `Caso no existe` are skipped, case-insensitive.
- Memo cells may be empty; empty memo values become `Sin palabra`.
- Each valid cell becomes:

```ts
interface TrainingCase {
  par: string
  memo: string
  algoritmo: string
}
```

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
  theme: 'light' | 'dark' | 'system'
}
```

Hydration requirement:

- Any localStorage hook must avoid server/client HTML mismatches.
- Do not read localStorage in a `useState` initializer that runs during the
  first client render.
- The current hook uses `useSyncExternalStore` for this reason.

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

- Primary button advances the current flow.
- `Space` triggers the same advance behavior.
- In algorithm mode, state `3` shows a repeat button.
- `R` repeats the same case from active states.
- Timer resets whenever a new case starts, including a case selected from
  search.

## Case Search

The trainer sidebar must include a case search.

Requirements:

- Search by letter pair.
- Accept lowercase input but normalize to uppercase.
- Ignore non-letter characters.
- Show partial matches while typing.
- Selecting a result starts that exact case in recognition state.
- Selecting a case should reset the visual timer.

## UI Principles

- Dark, low-glare interface for long practice sessions.
- Stable dimensions for the trainer card to avoid jarring layout shifts.
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

Known warning:

- `app/lib/__tests__/matrix-transformer.test.ts` has an unused
  `validHeadersArb` warning.

