# Plan 001: Importar `defaultIssueStatuses` en `convex/issues.ts`

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in "STOP conditions" occurs, stop and report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- convex/issues.ts convex/issueStatuses.ts`
> If those files changed since this plan was written, compare the excerpts below against live code; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

`assertCanEnterStatus` in `convex/issues.ts` uses `defaultIssueStatuses.find(...)` as fallback when a status id is not persisted in the `issueStatuses` table, but the symbol is never imported in that file. The `??` short-circuit means the code only touches `defaultIssueStatuses` exactly when the fallback is needed — turning a clean "Unknown issue status" error into `ReferenceError: defaultIssueStatuses is not defined`. This repo has no typecheck script and Vite's build does not typecheck Convex functions, so the bug ships silently.

## Current state

- `convex/issues.ts` — backend issue mutations/queries; contains the broken reference.
- `convex/issueStatuses.ts` — exports `defaultIssueStatuses` (line 5) and seeds them into `issueStatuses`.

Imports at `convex/issues.ts:1-6`:

```ts
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { applyIssueStatusAutomations } from './issueAutomations';
import { listIssueStatusOptions } from './issueStatusOptions';
import { listOptions } from './projects';
```

Broken usage at `convex/issues.ts:228`:

```ts
const option = stored ?? defaultIssueStatuses.find((item) => item.id === status);
```

Precedent for the correct import shape — `convex/issueAutomations.ts:4`:

```ts
import { defaultIssueStatuses } from './issueStatuses';
```

## Commands you will need

| Purpose                                 | Command                              | Expected on success                                                                    |
| --------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| Build                                   | `bun run build`                      | exit 0                                                                                 |
| Lint                                    | `bun run lint`                       | exit 0                                                                                 |
| Typecheck (diagnostic only, not a gate) | `bunx tsc --noEmit -p tsconfig.json` | note: baseline unknown; do not treat pre-existing errors outside your diff as failures |

## Scope

**In scope**:

- `convex/issues.ts` (imports block only)

**Out of scope**:

- `convex/issueStatuses.ts`, `convex/issueAutomations.ts`, `convex/issueStatusOptions.ts` — read-only references.
- Any change to `assertCanEnterStatus` logic beyond the missing import (status-type semantics are Plan 010's job).

## Git workflow

- Work on the current branch; one commit at end.
- Commit message style (conventional commits, English subject): `fix(issues): import defaultIssueStatuses fallback used by status guard`

## Steps

### Step 1: Add the import

Add to the imports of `convex/issues.ts` (alphabetical position among the relative imports):

```ts
import { defaultIssueStatuses } from './issueStatuses';
```

**Verify**: `grep -n "defaultIssueStatuses" convex/issues.ts` → shows the import line and line ~229 (`const option = stored ?? ...`).

### Step 2: Verify

Run `bun run build && bun run lint`.

**Verify**: both exit 0. Additionally `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep issues.ts` returns nothing about `defaultIssueStatuses`.

## Test plan

No test suite exists in this repo (per AGENTS.md). Verification path is build + lint plus the greps above. Manual regression (optional, needs dev deployment): transition an issue to a status that exists only in `defaultIssueStatuses`; expect either success or the clean `Unknown issue status:` error — never a ReferenceError.

## Done criteria

- [ ] `bun run build` exits 0
- [ ] `bun run lint` exits 0
- [ ] `convex/issues.ts` imports `defaultIssueStatuses` from `'./issueStatuses'`
- [ ] No other file modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The excerpt at `convex/issues.ts:228` does not match (drift).
- Adding the import creates a lint error about circular imports between `issues.ts` and `issueStatuses.ts`.

## Maintenance notes

If `defaultIssueStatuses` is ever moved out of `convex/issueStatuses.ts`, update this import. Reviewer should confirm the import is value-imported (not `type`) since it is called at runtime. Plan 010 rewrites nearby logic in the same function — land this first.
