# Data Model

Last updated: 2026-07-06

## Domain Types

### `PieceType`

```ts
type PieceType = 'arista' | 'esquina'
```

### `TrainingCase`

The central training record:

```ts
interface TrainingCase {
  tipo: PieceType
  par: string
  memo: string
  algoritmo: string
  algoritmos?: string[]
  isLearned?: boolean
  streak?: number
}
```

Field meaning:

- `tipo`: edge or corner case.
- `par`: two-letter case pair, row header + column header.
- `memo`: memo word/image for the pair.
- `algoritmo`: original 3-style algorithm cell text.
- `algoritmos`: optional cleaned variants split from multiline algorithm cells.
- `isLearned`: whether the user marked the case as learned. Learned cases enter
  spaced-repetition rotation instead of always appearing every round.
- `streak`: consecutive successful recalls, `0`–`5`. Drives inclusion probability
  for learned cases.

Legacy stored cases without `tipo` are normalized to `arista` at read time.
Missing progress fields normalize to `isLearned: false` and `streak: 0`.

## CSV Matrix Format

The importer accepts up to three files per session:

- one shared **memo** matrix (required),
- one **edge algorithm** matrix (optional),
- one **corner algorithm** matrix (optional).

At least one algorithm file must be provided.

### Sizes

| Piece type | Matrix size | Typical letter count |
|------------|-------------|----------------------|
| Edges | 22×22 | 22 |
| Corners | 21×21 | 21 |

### Strict grid rules

Parsed CSV files must match the matrix exactly:

- `N+1` rows total (`1` header row + `N` data rows).
- `N+1` columns per row (`1` row-header column + `N` data columns).
- No trailing blank rows, counts, or notes after row `N+1`.
- `N` must be `21` or `22`.

### Header layout

For edges (`N = 22`):

```text
      A   B   C   ... V
A   ...
B   ...
...
V   ...
```

Spreadsheet coordinates:

- `A1`: ignored.
- `B1:W1`: column headers.
- `A2:A23`: row headers.
- `B2:W23`: data cells.

For corners (`N = 21`), the grid ends at column/row `U`.

Headers must be unique single-letter labels. Row and column headers must use
the same labels in the same order. Headers are normalized to uppercase during
import.

### Shared memo behavior

Memo lookup uses header labels, not only row/column indices. This allows a
22×22 memo matrix to serve a 21×21 corner algorithm matrix when every corner
header exists in the memo matrix.

`validateMemoCoversAlgo()` checks that all algorithm headers are present in the
memo matrix before transformation.

## Parsing

File:

```text
app/lib/csv-parser.ts
```

Public symbols:

- `ALLOWED_MATRIX_SIZES = [21, 22]`
- `parseCSVFile(file: File): Promise<ParsedMatrix>`
- `validateMatrixStructure(matrix: ParsedMatrix): ValidationResult`

Parser:

- Uses PapaParse.
- Does not treat the first row as named headers.
- Trims cell values.
- Does not skip empty lines automatically.
- Infers matrix size from the header row.
- Reads only the first `N` data rows; rejects extra trailing rows.

Structural validation checks:

- `N` is 21 or 22.
- `N` unique row headers and `N` unique column headers.
- Headers are single letters.
- Row and column headers match in the same order.
- Data grid is `N×N`.

## Transformation

File:

```text
app/lib/matrix-transformer.ts
```

Public functions:

```ts
transformMatrices(
  algoMatrix: ParsedMatrix,
  memoMatrix: ParsedMatrix,
  pieceType: PieceType,
): TrainingCase[]

validateMemoCoversAlgo(
  algoMatrix: ParsedMatrix,
  memoMatrix: ParsedMatrix,
): ValidationResult
```

Rules:

- Iterate every coordinate in the algorithm matrix.
- Skip empty algorithm cells.
- Skip algorithm cells that mark a non-existent case.
- Pair is `rowHeader + columnHeader`.
- Memo is resolved from the memo matrix by matching header labels.
- Empty memo becomes `Sin palabra`.
- Multiline algorithm cells are split into variants using line breaks.
- The original cell text remains in `algoritmo`.
- The cleaned list is stored in `algoritmos`.
- `tipo` is set from the import context.

## Case helpers

File:

```text
app/lib/training-cases.ts
```

Public helpers:

- `normalizeTrainingCase`
- `normalizeTrainingCases`
- `mergeCasesByType`
- `countCasesByType`
- `filterCasesByPiece`
- `caseKey`

`mergeCasesByType` replaces only the imported piece type and keeps the other
type's cases intact. When re-importing a piece type, existing `isLearned` and
`streak` values are preserved per stable case key (`tipo:par`).

## Spaced repetition

Files:

```text
app/lib/session-pool.ts
app/lib/case-progress.ts
```

### Session pool

Before shuffled or sequential selection, `buildSessionPool()` builds the active
practice pool:

- Unlearned cases (`isLearned === false`) are always included.
- Learned cases pass a random inclusion check based on current `streak`:
  - `streak <= 1`: 80% inclusion (newly learned, frequent review).
  - `streak === 2` or `3`: 50% inclusion (stabilizing).
  - `streak >= 4`: 20% inclusion (muscle memory, sporadic review).
- Fail-safe: if every learned case is filtered out, the lowest-streak learned
  case is forced in (or the first available case when all are learned).

`useCaseSelection` applies this filter before the existing shuffled-list
selection logic.

### Case progress mutations

`applyCaseRating(trainingCase, rating)`:

- `'good'`: increment `streak` by 1, capped at `5`.
- `'bad'`: reset `streak` to `0`.

`toggleCaseLearned(trainingCase)` flips `isLearned`.

Ratings are persisted through `updateCaseInArray()` into `bld-trainer-cases`.

### Round progress stats

File:

```text
app/lib/round-stats.ts
```

Types:

```ts
interface CatalogStats {
  total: number
  unlearned: number
  learned: number
}

interface RoundStats {
  roundSize: number
  unlearnedInRound: number
  reviewInRound: number
  completed: number
  remaining: number
}
```

Helpers:

- `getCatalogStats(cases)` — aggregate counts for the active practice set.
- `partitionSessionPool(pool)` — split pool into unlearned (nuevos) and learned
  (repaso) cases.
- `getRoundStats(pool, roundSize, completed)` — snapshot for the current round.

`useCaseSelection` owns round tracking. A round is one session-pool cycle
through the shuffled playlist (random) or pool index (sequential). Round pool
composition is fixed until the round completes and a new pool is built.

## Persistence

Keys:

```text
bld-trainer-cases
bld-trainer-prefs
```

`bld-trainer-cases`:

```ts
TrainingCase[]
```

`bld-trainer-prefs`:

```ts
interface UserPreferences {
  timerVisible: boolean
  selectionMode: 'random' | 'sequential'
  algorithmStep: boolean
  practicePiece: PieceType
  theme: 'light' | 'dark' | 'system'
}
```

Important:

- `theme` exists in the type but the app currently renders a fixed dark theme.
- `algorithmStep=false` skips the algorithm reveal step.
- `practicePiece` controls which cases are practiced and searched.
- Existing stored preferences may omit newer fields; callers should use
  fallback defaults with nullish coalescing.

## Storage Helpers

- `app/hooks/useLocalStorage.ts`: React hook for persisted state.
- `app/lib/storage-manager.ts`: imperative helpers for cases and preferences.

The trainer page uses `useLocalStorage` for reactive persistence and
`StorageManager` for explicit case save/clear operations.

## Hydration Rule

Do not read `localStorage` during the first client render in a way that changes
the rendered HTML compared with the server output.

Use the existing `useLocalStorage` hook when possible. Pass stable default
values from module-level constants, not inline literals like `[]`.

## Example Files

```text
examples/sample-memos.csv
examples/sample-algorithms.csv
examples/sample-algorithms-corners.csv
```

- Memo and edge examples are 22×22.
- Corner algorithm example is 21×21.
- All examples are sparse but structurally valid.
