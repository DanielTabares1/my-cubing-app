# My Cubing Tool

My Cubing Tool is an offline-first Next.js app for speedcubing practice tools.
The current MVP is a 3Style BLD trainer for edges and corners. The home page is
a tool selector so more utilities can be added later without changing the
product entry point.

## Current Product

- `/` is the tool hub. It shows the active 3Style Trainer and disabled future
  tool slots.
- `/trainer` is the current production workflow.
- Data is local-only. There is no backend, database, auth, or network sync.
- Uploaded CSV data and user preferences are stored in `localStorage`.

## Main Features

- Import CSV matrices for a shared memo plus edge and/or corner algorithms.
- Practice edges or corners with a header toggle (`Aristas` / `Esquinas`).
- Separate sidebar counts for edges, corners, and total cases.
- Flashcard flow:
  - `Idle -> Pair recognition -> Memo -> Algorithm -> Next case`
  - Optional `Solo memo` mode:
    `Idle -> Pair recognition -> Memo -> Next case`
- Search cases by letter pair within the active piece type.
- Jump directly to a searched case.
- Random or sequential case selection.
- Visual timer that resets on each new case.
- Keyboard shortcuts:
  - `Space`: advance the current practice step.
  - `R`: repeat the same case when available.
- The timer stays at `0.00` until a case is active.
- Collapsible CSV import panel: visible first, hidden after import, reopenable
  via **Actualizar archivos CSV**.

## Tech Stack

- Next.js `16.2.9` with App Router.
- React `19.2.4`.
- Tailwind CSS `4`.
- PapaParse for client-side CSV parsing.
- Vitest and Testing Library for tests.

Important: this project uses a newer Next.js version with breaking changes.
Before changing Next-specific APIs or route conventions, read the relevant local
docs under `node_modules/next/dist/docs/`. See `AGENTS.md`.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validate Changes

```bash
npm run lint
npm run build
npm run test
```

## CSV Input Format

### Files

| File | Required | Purpose |
|------|----------|---------|
| Memo matrix | Yes | Shared memo words for both piece types |
| Edge algorithms | No* | 22×22 edge 3-style algorithms |
| Corner algorithms | No* | 21×21 corner 3-style algorithms |

\*At least one algorithm file (edges or corners) is required per import.

Imports merge by piece type: re-importing edges does not remove corner cases.

### Matrix shape

Each CSV must be a **strict** square matrix:

- **22×22** for edges (22 letter headers).
- **21×21** for corners (21 letter headers).

Layout:

- Row `1`: empty top-left cell, then column headers.
- Rows `2…N+1`: row header in column `A`, then data cells.
- Exactly `N+1` rows and `N+1` columns in the parsed file — no trailing blank
  rows, counts, or notes after the matrix.

Headers must be unique single letters. Row and column headers must match in the
same order. Headers are normalized to uppercase during import.

The shared memo matrix can be 22×22 while corner algorithms are 21×21. Memo
lookup uses header letters, so the memo file only needs to contain every letter
used by the algorithm matrix being imported.

### Case filtering

The algorithm matrix decides which cases exist:

- Empty algorithm cells are skipped.
- Flexible non-existent-case markers are skipped (`Caso no existe`, `N/A`, `x`,
  `-`, etc.).
- Memo cells may be empty; they become `Sin palabra`.
- Multiline algorithm cells become multiple variants for the same pair.

Flattened case shape:

```ts
interface TrainingCase {
  tipo: 'arista' | 'esquina'
  par: string
  memo: string
  algoritmo: string
  algoritmos?: string[]
}
```

Example edge case:

```ts
{
  tipo: 'arista',
  par: 'AD',
  memo: 'Adios',
  algoritmo: "U R U' R'"
}
```

Legacy stored cases without `tipo` are treated as `arista`.

## Example CSV Files

Small valid examples live in `examples/`:

- `examples/sample-memos.csv` — 22×22 shared memo template
- `examples/sample-algorithms.csv` — 22×22 edge algorithms
- `examples/sample-algorithms-corners.csv` — 21×21 corner algorithms

Use them as upload templates. They are sparse but structurally valid.

## Important Files

- `app/page.tsx`: tool hub.
- `app/trainer/page.tsx`: trainer screen orchestration.
- `app/components/CSVImporter.tsx`: CSV upload, validation, transformation.
- `app/components/TrainerCard.tsx`: practice card UI and reveal states.
- `app/components/VisualTimer.tsx`: timer display and visibility toggle.
- `app/hooks/useTrainerState.ts`: flashcard state machine.
- `app/hooks/useLocalStorage.ts`: hydration-safe localStorage state.
- `app/lib/csv-parser.ts`: PapaParse wrapper and matrix validation.
- `app/lib/matrix-transformer.ts`: matrix-to-cases transformation.
- `app/lib/training-cases.ts`: merge, filter, and count helpers.
- `app/lib/types.ts`: shared domain types.

More detailed notes live in `docs/`.

## Documentation Map

- `docs/ARCHITECTURE.md`: routes, components, hooks, state flow.
- `docs/DATA_MODEL.md`: CSV structure, transformation, localStorage keys.
- `docs/DEVELOPMENT.md`: common commands, conventions, gotchas.
- `docs/HANDOFF.md`: current state, known issues, future work.
- `requirements.md`: live product requirements for the MVP.
- `AGENTS.md`: mandatory agent instructions and project-specific guardrails.
