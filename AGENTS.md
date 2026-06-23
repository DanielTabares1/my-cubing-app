<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes -- APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation
notices.
<!-- END:nextjs-agent-rules -->

# Project Notes For Agents

This project is `my-cubing-tool`, a local-first Next.js app for cubing tools.
The active MVP is a 3Style BLD edge trainer.

## Before Editing

- Read `README.md`.
- Read the relevant file in `docs/`:
  - `docs/ARCHITECTURE.md` for route/component/hook structure.
  - `docs/DATA_MODEL.md` for CSV and storage behavior.
  - `docs/DEVELOPMENT.md` for commands and gotchas.
  - `docs/HANDOFF.md` for current state and next likely tasks.
- If touching Next.js APIs, also read the local Next docs under
  `node_modules/next/dist/docs/`.

## Product Shape

- `/` is the tool hub. Do not replace it with a redirect.
- `/trainer` is the active 3Style Trainer.
- The app is offline-first and client-side only.
- Do not add a backend, auth, database, or cloud sync unless explicitly asked.

## Hydration And localStorage

Be careful with persisted browser state.

- Do not read `localStorage` in a `useState` initializer for components that
  render during SSR/hydration.
- Use the existing `useLocalStorage` hook unless there is a strong reason not
  to.
- The hook is designed with `useSyncExternalStore` so server HTML and first
  client hydration match.
- Timer visibility, selection mode, algorithm-step mode, and cases are
  persisted.

## Core State

- `useTrainerState` owns the trainer state machine.
- `TrainerCard` should stay mostly presentational.
- `CaseSearch` in `app/trainer/page.tsx` selects an exact case through
  `practiceCase`.
- `VisualTimer` resets via a token passed from the page.

## Verification

Run before final handoff:

```bash
npm run lint
npm run build
```

Run tests when logic changes:

```bash
npm run test
```

Known warning:

- `app/lib/__tests__/matrix-transformer.test.ts` currently warns that
  `validHeadersArb` is unused.

