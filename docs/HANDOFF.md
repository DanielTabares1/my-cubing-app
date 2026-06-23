# Handoff Notes

Last updated: 2026-06-23

## Current State

The MVP has moved beyond the default create-next-app scaffold.

Completed:

- Home page is a tool selector.
- 3Style Trainer is the active tool.
- Trainer UI has a mature dark dashboard layout.
- CSV import works client-side.
- Cases and preferences persist in `localStorage`.
- Trainer supports random and sequential modes.
- Trainer supports optional algorithm reveal.
- Sidebar search can jump directly to a case by letter pair.
- Timer reset behavior handles regular next-case flow and search selection.
- Hydration mismatch from timer visibility/localStorage has been fixed by
  moving persistence to `useSyncExternalStore`.

## Current Known Issues

- Lint warning:
  - `app/lib/__tests__/matrix-transformer.test.ts`
  - `validHeadersArb` is unused.
- Several old source comments still contain mojibake from earlier generated
  text. Runtime UI has been mostly cleaned, but comments may still look odd.
- `StorageManager` has some Spanish strings with mojibake. The trainer mostly
  uses `useLocalStorage`, but those strings may surface on storage quota errors.
- `theme` exists in `UserPreferences` but no theme switcher is implemented.
- `CLAUDE.md` only points to `AGENTS.md`.

## Recent Important Changes

### Tool Hub

`app/page.tsx` now renders the product hub. Do not revert to redirecting to
`/trainer`.

### Solo Memo Mode

`UserPreferences.algorithmStep` controls whether the algorithm reveal step is
included.

When `algorithmStep=false`:

```text
Pair -> Memo -> Next case
```

When `algorithmStep=true`:

```text
Pair -> Memo -> Algorithm -> Next case
```

### Case Search

`CaseSearch` lives inside `app/trainer/page.tsx`.

Search behavior:

- Input max length is 2.
- Non-letters are stripped.
- Value is uppercased.
- Matching uses `startsWith`.
- Selecting a result calls `practiceCase`.

### Hydration Fix

The old `useLocalStorage` read localStorage during state initialization. This
caused hydration mismatch when persisted preferences differed from defaults.

The hook now uses `useSyncExternalStore`.

## Suggested Next Tasks

High value:

- Remove mojibake from source comments and storage error strings.
- Fix the unused test warning.
- Add tests for:
  - `algorithmStep=false` trainer flow.
  - `practiceCase`.
  - `CaseSearch` filtering and selection.
- Split `CaseSearch` and `Metric` out of `app/trainer/page.tsx` if the page
  grows further.
- Add a small sample-data helper or better onboarding for first-time users.

Medium value:

- Add import summary after CSV upload:
  - number of cases imported.
  - number of skipped cells.
- Add exact match prioritization in search if partial result lists become long.
- Add case categories/subsets later.

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

