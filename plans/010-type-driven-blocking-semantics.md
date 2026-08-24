# Plan 010: Gobernar la semántica de bloqueo por `status.type` y validar estados al crear

> **Executor instructions**: Follow this plan step by step. STOP conditions below.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- convex/issues.ts convex/issueStatuses.ts`
> Mismatch → STOP.

## Status

- **Priority**: P2
- **Effort**: S/M
- **Risk**: MED
- **Depends on**: plans/001-import-default-issue-statuses.md (same file, same mechanism)
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

Blocking semantics are documented as type-driven ("`completed` is required by blocking semantics" — docs/agents/issue-tracker.md) and `assertCanEnterStatus` already checks `option.type === 'unstarted'`. But three places still use hardcoded status-id lists, so custom statuses diverge from built-ins:

1. `resolvedIssueStatusIds = ['completed','archived','canceled','cancelled']` decides when a blocker counts as done. A user-created status with `type === 'completed'` (e.g. id "hecho") does NOT unblock, while the MCP execution-path (`mcp/execution-path.ts`) treats it as complete via type.
2. `addBlocker` rejects adding an incomplete blocker only if `blocked.status ∈ ['in-progress','technical-review','completed']` — a custom `started`-type status accepts blockers after work began.
3. `update`'s `advanceParent` triggers only on literal `'in-progress'|'completed'` and moves parents to literal `'to-do'`→`'in-progress'`, ignoring renamed/custom statuses.
4. `create`/`createWithSubissues` insert `input.status` without validating existence (MCP allows any non-empty string), producing issues in phantom statuses that escape all guards.

## Current state

All in `convex/issues.ts`:

```ts
// lines 11-12
const resolvedIssueStatusIds = new Set(['completed', 'archived', 'canceled', 'cancelled']);
const isResolvedIssueStatus = (statusId: string) => resolvedIssueStatusIds.has(statusId);

// ~line 1302 (addBlocker)
if (
   !isResolvedIssueStatus(blocker.status) &&
   ['in-progress', 'technical-review', 'completed'].includes(blocked.status)
)
   throw new Error('Cannot add an incomplete blocker to an issue that has already started.');

// ~line 1074 (update mutation, advanceParent block)
if (advanceParent && issue.parentIssueId && (status === 'in-progress' || status === 'completed')) {
   const parent = await ctx.db.get(issue.parentIssueId);
   if (parent?.status === 'to-do') {
      await transitionIssueStatus(ctx, parent, 'in-progress', now);
   }
}

// ~line 652 (create): inserts input.status verbatim; same at ~722 createWithSubissues
```

Type lookup precedent — `assertCanEnterStatus` (~lines 220–233):

```ts
const stored = await ctx.db
   .query('issueStatuses')
   .withIndex('by_option_id', (q) => q.eq('id', status))
   .unique();
const option = stored ?? defaultIssueStatuses.find((item) => item.id === status);
if (!option) throw new Error(`Unknown issue status: ${status}.`);
```

`convex/schema.ts` defines `issueStatuses` with fields `id`, `type` (`'unstarted' | 'started' | 'completed'`), etc. Confirm exact field names before coding.

## Commands you will need

| Purpose                         | Command               | Expected |
| ------------------------------- | --------------------- | -------- |
| Build                           | `bun run build`       | exit 0   |
| Lint                            | `bun run lint`        | exit 0   |
| Push functions (dev deployment) | `bun run convex:push` | exit 0   |

## Scope

**In scope**:

- `convex/issues.ts` only

**Out of scope**:

- `mcp/execution-path.ts` (already type-correct).
- `issueAutomations.ts`.
- Renaming/removing existing statuses or migrating data.
- UI status pickers.

## Git workflow

- One commit: `fix(issues): derive blocking semantics from status type instead of hardcoded ids`

## Steps

### Step 1: Add a type-resolution helper

Near `isResolvedIssueStatus`, add:

```ts
async function getStatusType(ctx: MutationCtx, statusId: string): Promise<string | null> {
   const stored = await ctx.db
      .query('issueStatuses')
      .withIndex('by_option_id', (q) => q.eq('id', statusId))
      .unique();
   return stored?.type ?? defaultIssueStatuses.find((item) => item.id === statusId)?.type ?? null;
}
```

(Verify `by_option_id` index name against schema first.)

**Verify**: build passes.

### Step 2: Make resolution type-driven

Replace `isResolvedIssueStatus(statusId)` call sites to use:

```ts
const type = await getStatusType(ctx, issue.status);
const resolved = type === 'completed' || issue.status === 'archived';
```

Keep `'archived'` as an explicit exception (it may not carry a `completed` type). Update the sites in `assertCanEnterStatus` blocker filtering and anywhere else `isResolvedIssueStatus` is used inside mutations that have `ctx`. Delete `resolvedIssueStatusIds` once unused.

### Step 3: Fix addBlocker's started-check

Replace the hardcoded list check with:

```ts
const blockedType = await getStatusType(ctx, blocked.status);
if (!blockerResolved && blockedType !== null && blockedType !== 'unstarted')
   throw new Error('Cannot add an incomplete blocker to an issue that has already started.');
```

### Step 4: Make advanceParent type-driven

Derive types for `status` and parent's current/target statuses via `getStatusType`; trigger when the new status has type `'started' | 'completed'` and the parent currently sits in any `'unstarted'` status; transition the parent to the project's default `'started'` status — resolve it by querying `issueStatuses` for the project's first `started`-type status ordered by position; fall back to `'in-progress'` only if no such status exists.

### Step 5: Validate status on create

In `create` and `createWithSubissues`, before insert, resolve the option like `assertCanEnterStatus` does (extract its lookup into a shared `getStatusOption(ctx, status)` helper both can use) and throw `Unknown issue status: <id>.` when absent.

### Step 6: Verify

Run `bun run build && bun run lint && bun run convex:push`.

**Verify**: all exit 0.

## Test plan

No test suite. Manual matrix on dev deployment (both `/issues` and MCP where applicable):

1. Custom status with `type: 'completed'` completes a blocker → blocked issue can enter a `started` status.
2. Issue already in a custom `started` status rejects a new incomplete blocker.
3. Completing a subissue advances a parent sitting in a custom `unstarted` status.
4. Creating an issue with a nonexistent status id fails cleanly.

## Done criteria

- [ ] `grep -n "resolvedIssueStatusIds\|'technical-review'" convex/issues.ts` → no remaining semantic uses of hardcoded ids (string literals may remain only in default-seeding contexts)
- [ ] Create path rejects unknown statuses
- [ ] Build, lint, convex:push all pass
- [ ] Only `convex/issues.ts` modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- Schema lacks `type` field or `by_option_id` index under expected names.
- Any existing automation/MCP flow breaks during manual matrix in a way not explained by the plan — report the flow.

## Maintenance notes

This is the semantic heart of blocking; reviewer should read the final diff of `assertCanEnterStatus`, `addBlocker`, `transitionIssueStatus`, and `create` together. If per-project status sets ever become optional, `getStatusType` fallback order must be revisited.
