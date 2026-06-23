# Development Guide

Last updated: 2026-06-22

## Commands

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```

Tests:

```bash
npm run test
```

Watch tests:

```bash
npm run test:watch
```

## Current Verification Status

As of the latest handoff:

- `npm run build` passes.
- `npm run lint` passes.
- `npm run test` passes.

## Coding Conventions

- Use TypeScript.
- Keep UI components small and focused.
- Prefer existing hooks/components over introducing new state patterns.
- Keep business logic in `app/lib` or hooks, not buried in JSX.
- Keep `TrainerCard` mostly presentational.
- Keep page-level orchestration in `app/trainer/page.tsx`.
- Avoid adding dependencies unless there is a clear need.
- Pass stable module-level defaults into `useLocalStorage` (never inline `[]`).

## Styling Conventions

- Tailwind CSS v4.
- Global CSS belongs in `app/globals.css`.
- Avoid decorative, marketing-style sections for app surfaces.
- Keep controls compact and stable.
- Keep dark theme low-glare.
- Use responsive classes for mobile and desktop.
- Anchor the trainer card near the top of the main column.

## Next.js Version Gotchas

The project uses Next.js `16.2.9`. Do not rely only on old Next.js knowledge.

Before changing Next-specific APIs, read local docs under:

```text
node_modules/next/dist/docs/
```

## Hydration Gotchas

This app renders client components through App Router. Server output must match
the first client hydration render.

Avoid:

- Reading `localStorage` in `useState(() => ...)`.
- Rendering different HTML based on `typeof window`.
- Rendering different HTML based on time/random values.
- Passing unstable inline defaults such as `useLocalStorage(key, [])`.

Use:

- `useLocalStorage` for persisted state.
- Module-level constants for default values.
- Effects or subscriptions for browser-only synchronization after hydration.

## Adding A New Tool

Expected approach:

1. Add a route under `app/<tool>/page.tsx`.
2. Add the tool card to `app/page.tsx`.
3. Keep the tool hub as the product entry point.
4. Add docs for the new tool in `docs/`.
5. Add tests for shared logic.

Do not make `/` redirect to the new tool.

## Updating Trainer Behavior

Start with:

- `app/hooks/useTrainerState.ts` for flow changes.
- `app/trainer/page.tsx` for page wiring.
- `app/components/TrainerCard.tsx` for visual state.
- `app/hooks/__tests__/useTrainerState.test.ts` for state machine tests.

If changing CSV behavior:

- Update `app/lib/csv-parser.ts`.
- Update `app/lib/matrix-transformer.ts`.
- Update `app/lib/training-cases.ts` when merge/filter behavior changes.
- Update tests in `app/lib/__tests__/`.
- Update `docs/DATA_MODEL.md`.

## Manual Smoke Test

After UI changes:

1. Start dev server.
2. Open `/`.
3. Open 3Style Trainer.
4. Confirm the CSV import panel is visible when no cases are loaded.
5. Upload `examples/sample-memos.csv` as memo.
6. Upload `examples/sample-algorithms.csv` as edge algorithms.
7. Import cases and confirm the import panel closes.
8. Confirm sidebar shows edge count and **Actualizar archivos CSV**.
9. Start practice for edges.
10. Confirm the timer starts only after a case is active.
11. Press `Space` through the flow.
12. Toggle `Solo memo`.
13. Switch practice to corners after importing
    `examples/sample-algorithms-corners.csv`.
14. Search a pair and select it.
15. Toggle timer visibility and reload to confirm no hydration error.
