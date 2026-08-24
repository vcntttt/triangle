# Plan 014: Anidar la jerarquía de issues recursivamente (nietos, colapso de subárbol, contadores)

> **Executor instructions**: Follow this plan step by step. STOP conditions below.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- components/common/issues/group-issue-rows.ts components/common/issues/issues-workspace.tsx`
> Mismatch → STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED (affects row order consumed by j/k navigation, collapse persistence, and counters on BOTH surfaces)
- **Depends on**: plans/009-list-ordering-respected.md (signature/order param must exist first)
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

`getIssueListRows` nests exactly one level. With 3-level hierarchies:

- A grandchild whose parent is visible is skipped without being marked seen, then re-emitted by the trailing loop as a loose root row — visually detached from its parent.
- Collapsing a parent only hides direct children; grandchildren remain as root rows, so "collapse" doesn't hide the subtree.
- Child rows are pushed with hardcoded `childrenCount: 0`, so a child with subissues shows no chevron/count.

## Current state

Full current algorithm in `components/common/issues/group-issue-rows.ts` (88 lines): sorts, then iterates roots (issues whose `parentIssueId` isn't in the map), pushes children one level deep (`nestingLevel: 1`, counts zeroed), marks seen; trailing loop emits unseen issues at level 0.

Consumers of the rows:

- `group-issues.tsx:58-60` and `issues-workspace.tsx:504` render rows with indentation by `nestingLevel`, chevron driven by `childrenCount`.
- Collapse state persists via localStorage keys `triangle:issues:collapsed-parent-ids` (`collapsedParentIds` Set passed in).
- j/k navigation consumes the flat row list in order.

After Plan 009 the signature includes an `order: IssueOrderConfig` parameter — keep it.

## Commands you will need

| Purpose     | Command                    | Expected        |
| ----------- | -------------------------- | --------------- |
| Build       | `bun run build`            | exit 0          |
| Lint        | `bun run lint`             | exit 0          |
| React check | `bunx react-doctor@latest` | no new findings |

## Scope

**In scope**:

- `components/common/issues/group-issue-rows.ts`
- Call-site adjustments ONLY if prop shapes change (avoid changing them)

**Out of scope**:

- Backend hierarchy validation (`validateParentAssignment`) — already correct.
- Board/graph views.
- Collapse persistence format (keep same localStorage keys and Set<string> semantics).
- Rendering components beyond what's needed to display deeper nesting (check whether indentation styling supports arbitrary depth; if it hardcodes two levels, that rendering tweak IS in scope minimally).

## Git workflow

- One commit: `fix(issues): nest issue hierarchy recursively with subtree-aware collapse`

## Steps

### Step 1: Rewrite row construction as recursive emission

Replace the body after sorting with a DFS over the parent-child forest built from the sorted array:

```ts
const childrenOf = new Map<string | undefined, Issue[]>();
for (const issue of sortedIssues) {
   const key = issue.parentIssueId ?? undefined;
   childrenOf.set(key, [...(childrenOf.get(key) ?? []), issue]);
}

const rows: IssueListRow[] = [];
const emit = (issue: Issue, level: number) => {
   const kids = childrenOf.get(issue.id) ?? [];
   rows.push({
      issue,
      nestingLevel: level,
      childrenCount: kids.length,
      completedChildrenCount: kids.filter(done).length,
   });
   if (!collapsedParentIds.has(issue.id)) {
      for (const kid of kids) emit(kid, level + 1);
   }
};
for (const root of childrenOf.get(undefined) ?? []) emit(root, 0);
// cycle safety: guard with a visited set; if a cycle exists (shouldn't — backend prevents),
// break by skipping already-emitted ids instead of looping forever
```

Keep the exact `IssueListRow` shape so all consumers compile unchanged. Define `done` exactly like today's check (`status.id === 'completed' || status.id === 'archived'`). Add the visited-guard even though backend prevents cycles — cheap insurance against infinite recursion crashing the tab.

### Step 2: Verify consumers tolerate depth > 2

Read the row renderer(s): if indentation uses `paddingLeft: nestingLevel * X` or similar arithmetic, nothing to change. If there are literal branches for levels 0/1 only, extend minimally to arbitrary depth using the same spacing unit.

**Verify**: `bun run build && bun run lint && bunx react-doctor@latest` → clean.

## Test plan

No test suite; executable sanity via bun -e importing `getIssueListRows` with a fabricated 3-level fixture asserting: 5 rows in DFS order, correct nestingLevels [0,1,2,1,0], grandchild hidden when root collapsed, child row carries childrenCount 1. If standalone import fails (path aliases), replicate logic verification through reading plus manual UI test: create issue → subissue → sub-subissue on `/issues`; verify indent, chevron on middle node, collapse hides whole subtree; repeat on a project issues tab.

## Done criteria

- [ ] Grandchildren render nested under parents on both surfaces
- [ ] Collapsing hides entire subtree; counts/chevrons reflect direct children
- [ ] Row type unchanged; no consumer signature breaks
- [ ] Build/lint/react-doctor pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- Renderer hardcodes two-level layout in a way requiring broad redesign — report what you found.
- j/k navigation or selection range logic demonstrably depends on the old "loose root rows" behavior.

## Maintenance notes

Collapse semantics change slightly: previously-collapsed grandchildren now stay hidden under a collapsed ancestor — that's the fix, not a regression. Reviewer should diff carefully against Plan 009's ordering work since both touch this function.
