# Plan 004: Evitar salto a issue arbitrario cuando `navigateToAdjacentIssue` recibe índice −1

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm expected results before moving on. STOP conditions below.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- components/common/issues/issues-workspace.tsx`
> On change, compare excerpt; mismatch → STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

After deleting or archiving the selected issue, the workspace calls `navigateToAdjacentIssue(issueId)`. If the list already refetched without that issue, `findIndex` returns `-1`, and `filteredIssues[-1 + 1]` is `filteredIssues[0]` — the user lands on an arbitrary (first) issue instead of closing the detail or moving to a real neighbor.

## Current state

- `components/common/issues/issues-workspace.tsx` — shared workspace for `/issues` and project tab.

Excerpt (~lines 679–690):

```ts
function navigateToAdjacentIssue(issueId: string) {
   const currentIndex = filteredIssues.findIndex((issue) => issue.id === issueId);
   const nextIssue = filteredIssues[currentIndex + 1] ?? filteredIssues[currentIndex - 1];

   if (nextIssue) {
      ...selection change / navigate...
      return;
   }
   // existing fallback when no next issue found (clears selection)
}
```

The function's intent: prefer next, fall back to previous, else fall through to the "no adjacent issue" branch that clears the selection.

## Commands you will need

| Purpose | Command         | Expected |
| ------- | --------------- | -------- |
| Build   | `bun run build` | exit 0   |
| Lint    | `bun run lint`  | exit 0   |

## Scope

**In scope**:

- `components/common/issues/issues-workspace.tsx` (`navigateToAdjacentIssue` only)

**Out of scope**:

- The delete/archive mutations themselves.
- `onSelectAdjacentIssue` callback contract.

## Git workflow

- One commit: `fix(issues): don't jump to first issue after deleting missing one`

## Steps

### Step 1: Guard the not-found case

Replace the first two lines of the function body with:

```ts
const currentIndex = filteredIssues.findIndex((issue) => issue.id === issueId);
if (currentIndex === -1) {
   return;
}
const nextIssue = filteredIssues[currentIndex + 1] ?? filteredIssues[currentIndex - 1];
```

Rationale: if the deleted issue is gone from the list we cannot know a sensible neighbor; falling through to the existing "no adjacent issue" clearing path is wrong too because it would clear a selection that may still be open — early-return keeps current UI state stable and is the minimal correct behavior.

**Verify**: read back the function; confirm `-1` never indexes the array.

### Step 2: Verify

Run `bun run build && bun run lint`.

**Verify**: both exit 0.

## Test plan

No test suite. Manual: delete an issue from `/issues`; expect detail to close or stay as-is, never to select the first row. Same check on a project issues tab.

## Done criteria

- [ ] `currentIndex === -1` guard present in `navigateToAdjacentIssue`
- [ ] `bun run build && bun run lint` exit 0
- [ ] No other files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- Excerpt doesn't match (drift).
- The existing "no next issue" branch turns out to already handle `-1` correctly (then close this plan as REJECTED in the index).

## Maintenance notes

If keyboard j/k navigation ever reuses `navigateToAdjacentIssue`, keep the guard: `-1` means "target absent", not "start of list".
