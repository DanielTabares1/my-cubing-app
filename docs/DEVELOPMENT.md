# Development Guide

Last updated: 2026-06-23

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
- `npm run lint` passes with one known warning.

Known lint warning:

```text
app/lib/__tests__/matrix-transformer.test.ts
validHeadersArb is assigned a value but never used
```

## Coding Conventions

- Use TypeScript.
- Keep UI components small and focused.
- Prefer existing hooks/components over introducing new state patterns.
- Keep business logic in `app/lib` or hooks, not buried in JSX.
- Keep `TrainerCard` mostly presentational.
- Keep page-level orchestration in `app/trainer/page.tsx`.
- Avoid adding dependencies unless there is a clear need.

## Styling Conventions

- Tailwind CSS v4.
- Global CSS belongs in `app/globals.css`.
- Avoid decorative, marketing-style sections for app surfaces.
- Keep controls compact and stable.
- Keep dark theme low-glare.
- Use responsive classes for mobile and desktop.

## Next.js Version Gotchas

The project uses Next.js `16.2.9`. Do not rely only on old Next.js knowledge.

Before changing Next-specific APIs, read local docs under:

```text
node_modules/next/dist/docs/
```

Useful docs:

```text
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md
```

## Hydration Gotchas

This app renders client components through App Router. Server output must match
the first client hydration render.

Avoid:

- Reading `localStorage` in `useState(() => ...)`.
- Rendering different HTML based on `typeof window`.
- Rendering different HTML based on time/random values.

Use:

- `useLocalStorage` for persisted state.
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
- Update tests in `app/lib/__tests__/`.
- Update `docs/DATA_MODEL.md`.

## Manual Smoke Test

After UI changes:

1. Start dev server.
2. Open `/`.
3. Open 3Style Trainer.
4. Upload `Memo BLD - Aristas.csv` as algorithms.
5. Upload `Memo BLD - Memo.csv` as memos.
6. Import cases.
7. Start practice.
8. Press `Space` through the flow.
9. Toggle `Solo memo`.
10. Search a pair and select it.
11. Toggle timer visibility and reload to confirm no hydration error.

