# Plan 009: Respetar `orderBy`/`orderDirection` en la vista de lista de issues

> **Executor instructions**: Follow this plan step by step. STOP conditions below.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- components/common/issues/group-issues.tsx components/common/issues/group-issue-rows.ts components/common/issues/issues-workspace.tsx lib/issue-view.ts`
> Mismatch → STOP.

## Status

- **Priority**: P2
- **Effort**: S/M
- **Risk**: LOW-MED
- **Depends on**: none (but Plan 014 builds on this one — land 009 first)
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

The Display menu lets the user pick "Order by" (priority/title/created) and a direction. `sortIssuesForDisplay` (`lib/issue-view.ts:114`) implements it correctly, but both list-rendering paths then call `getIssueListRows`, which unconditionally re-sorts with `sortIssuesByConfiguredPriority` (`group-issue-rows.ts:17`). Net effect: choosing title/created or descending is a silent no-op in list view (hierarchy and flat). Board view ignoring order may be documented; the list must honor it.

## Current state

- `components/common/issues/group-issue-rows.ts` — pure row builder; signature:

```ts
export function getIssueListRows(
   issues: Issue[],
   listMode: 'hierarchy' | 'flat' = 'hierarchy',
   collapsedParentIds: ReadonlySet<string> = new Set(),
   priorities: IssueOrderOption[] = []
): IssueListRow[];
// line 17: const sortedIssues = sortIssuesByConfiguredPriority(issues, priorities);
```

- Callers:
   - `components/common/issues/group-issues.tsx:58-60` — per status group; receives already-grouped issues.
   - `components/common/issues/issues-workspace.tsx:504` — same pattern inside its own grouping loop.
- `lib/issue-view.ts:196` — `buildIssueDisplayGroups` sorts with `sortIssuesForDisplay(issues, display, orderedPriorities)` BEFORE grouping, so groups contain correctly sorted arrays that `getIssueListRows` then destroys.

Repo convention: pure helpers in `lib/` + thin consumers; keep that. Both surfaces (`/issues` and project tab) render through these shared files — fixing here fixes both.

## Commands you will need

| Purpose     | Command                    | Expected        |
| ----------- | -------------------------- | --------------- |
| Build       | `bun run build`            | exit 0          |
| Lint        | `bun run lint`             | exit 0          |
| React check | `bunx react-doctor@latest` | no new findings |

## Scope

**In scope**:

- `components/common/issues/group-issue-rows.ts`
- `components/common/issues/group-issues.tsx`
- `components/common/issues/issues-workspace.tsx` (only the call sites + threading one prop)
- `lib/issue-view.ts` (only if exporting an existing comparator requires it)

**Out of scope**:

- Board/grid ordering behavior.
- Keyboard j/k navigation semantics beyond confirming they follow row order (they consume rows as produced).
- Saved-view persistence shape.

## Git workflow

- One commit: `fix(issues): apply configured ordering in list view`

## Steps

### Step 1: Make `getIssueListRows` accept a pre-sorted contract

Change the signature to take an optional comparator config and stop hardcoding priority:

```ts
export type IssueOrderConfig =
   | { kind: 'priority'; priorities: IssueOrderOption[] }
   | { kind: 'display'; display: IssueDisplayConfig; priorities: IssueOrderOption[] };

export function getIssueListRows(
   issues: Issue[],
   listMode: 'hierarchy' | 'flat' = 'hierarchy',
   collapsedParentIds: ReadonlySet<string> = new Set(),
   order: IssueOrderConfig = { kind: 'priority', priorities: [] }
): IssueListRow[] {
   const sortedIssues =
      order.kind === 'display'
         ? sortIssuesForDisplay(issues, order.display, order.priorities)
         : sortIssuesByConfiguredPriority(issues, order.priorities);
   ...
```

Import `sortIssuesForDisplay` and `IssueDisplayConfig` from `@/lib/issue-view`.

**Verify**: `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "group-issue-rows|group-issues|issues-workspace"` → only errors about now-mismatched call sites (fixed next).

### Step 2: Thread display config from callers

In both call sites, obtain the active display config and pass `{ kind: 'display', display, priorities }`:

- `group-issues.tsx`: it already reads `useIssueDisplay()` for `listMode`; extend to get the full display object (inspect the hook — `viewType`, `listMode`, and order fields live there) and pass it into `getIssueListRows`.
- `issues-workspace.tsx`: uses `const activeDisplay = viewOverride?.display ?? preferenceDisplay;` (~line 434). Pass that plus `initialPriorities` in the `getIssueListRows(...)` call at ~line 504.

Keep default parameter so any other callers compile unchanged.

**Verify**: `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "issues-workspace|group-"` → clean.

### Step 3: Verify build, lint, React

Run `bun run build && bun run lint && bunx react-doctor@latest`.

**Verify**: all clean.

## Test plan

No test suite; executable sanity via bun -e on the pure functions if importable, else manual matrix on `/issues` Display menu: order by title asc/desc, created asc/desc, priority — each must visibly reorder rows in hierarchy AND flat modes, and identically on a project's issues tab (AGENTS.md dual-surface rule).

## Done criteria

- [ ] List rows honor `orderBy` + `orderDirection` on both surfaces
- [ ] Priority remains the fallback when orderBy === priority
- [ ] `bun run build && bun run lint` exit 0
- [ ] No out-of-scope changes
- [ ] `plans/README.md` status row updated

## STOP conditions

- `useIssueDisplay()` doesn't expose order fields (only viewType/listMode) — report what it exposes instead of inventing state.
- j/k navigation demonstrably breaks after reordering (verify once manually or via reading the consumer of rows).

## Maintenance notes

Plan 014 rewrites the hierarchy nesting inside `getIssueListRows`; it will reuse the `order` parameter — do not change the signature again independently. Reviewer should diff both call sites carefully: passing preference display where viewOverride exists would silently override saved views.
