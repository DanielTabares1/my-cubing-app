# My Cubing Tool

My Cubing Tool is an offline-first Next.js app for speedcubing practice tools.
The current MVP focuses on a 3Style BLD edge trainer, but the home page is now a
tool selector so more utilities can be added later without changing the product
entry point.

## Current Product

- `/` is the tool hub. It shows the active 3Style Trainer and disabled future
  tool slots.
- `/trainer` is the current production workflow.
- Data is local-only. There is no backend, database, auth, or network sync.
- Uploaded CSV data and user preferences are stored in `localStorage`.

## Main Features

- Import two 22x22 CSV matrices: algorithms and memo words.
- Flatten matrices into searchable training cases.
- Practice flashcard flow:
  - `Idle -> Pair recognition -> Memo -> Algorithm -> Next case`
  - Optional `Solo memo` mode:
    `Idle -> Pair recognition -> Memo -> Next case`
- Search cases by letter pair from the sidebar.
- Jump directly to a searched case.
- Random or sequential case selection.
- Visual timer that resets on each new case.
- Keyboard shortcuts:
  - `Space`: advance the current practice step.
  - `R`: repeat the same case when available.

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

Known current lint warning:

- `app/lib/__tests__/matrix-transformer.test.ts`: `validHeadersArb` is unused.
  This warning predates the latest UI/documentation work.

## CSV Input Format

Both CSV files must represent the same 22x22 matrix layout:

- Row `1` contains column headers in cells `B1:W1`.
- Column `A` contains row headers in cells `A2:A23`.
- Headers must be the letters `A` through `V`, in order.
- Data lives in `B2:W23`.

The algorithm CSV controls which cases exist:

- Empty algorithm cells are skipped.
- Algorithm cells equal to `Caso no existe` are skipped, case-insensitive.
- Memo cells may be empty; they become `Sin palabra`.

Flattened case shape:

```ts
interface TrainingCase {
  par: string
  memo: string
  algoritmo: string
}
```

Example case:

```ts
{
  par: "AD",
  memo: "Adios",
  algoritmo: "U R U' R'"
}
```

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
- `app/lib/types.ts`: shared domain types.

More detailed notes live in `docs/`.

## Documentation Map

- `docs/ARCHITECTURE.md`: routes, components, hooks, state flow.
- `docs/DATA_MODEL.md`: CSV structure, transformation, localStorage keys.
- `docs/DEVELOPMENT.md`: common commands, conventions, gotchas.
- `docs/HANDOFF.md`: current state, known issues, future work.
- `requirements.md`: live product requirements for the MVP.
- `AGENTS.md`: mandatory agent instructions and project-specific guardrails.

