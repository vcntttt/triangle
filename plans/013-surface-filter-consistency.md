# Plan 013: Hacer consistentes los filtros entre superficies (My Work y "Save view" del proyecto)

> **Executor instructions**: Follow this plan step by step. STOP conditions below. This plan contains one product decision flagged for the maintainer — implement the recommended default and record it.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- src/routes/my-work.tsx components/common/views/saved-view-dialog.tsx components/common/projects/project-issues-tab.tsx`
> Mismatch → STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

Two surface divergences of the same kind — AGENTS.md requires `/issues` and every project issues tab to behave as one feature, and hidden filter application violates least surprise:

1. **My Work applies hidden global filters**: `src/routes/my-work.tsx` renders `IssuesWorkspace` WITHOUT `applyIssueFilters`, which defaults to `true` (`issues-workspace.tsx:305`). Filters left active on `/issues` silently filter My Work, which has no filter controls to show or clear them.
2. **"Save view" from the project tab captures invisible filters**: the dialog persists whatever is in the global filter store (`saved-view-dialog.tsx:91`), but the project tab renders with `applyIssueFilters={false}` (`project-issues-tab.tsx:61`) — so a view created there silently embeds criteria that are neither shown nor applied on the screen where it was created.

## Current state

- `src/routes/my-work.tsx` (~lines 25–41): `<IssuesWorkspace initialIssues={...} scope="all" ...>` — no `applyIssueFilters`.
- `components/common/issues/issues-workspace.tsx:305`: `applyIssueFilters = true` default; line 438 gates filtering on it.
- `components/common/projects/project-issues-tab.tsx:61`: passes `applyIssueFilters={false}` explicitly.
- `components/common/views/saved-view-dialog.tsx:91`: saves `filters` sourced from `useFilterStore()` (global preferences), regardless of surface.

## Commands you will need

| Purpose | Command         | Expected |
| ------- | --------------- | -------- |
| Build   | `bun run build` | exit 0   |
| Lint    | `bun run lint`  | exit 0   |

## Scope

**In scope**:

- `src/routes/my-work.tsx`
- `components/common/views/saved-view-dialog.tsx`

**Out of scope**:

- `project-issues-tab.tsx` (already correct; reference only).
- Redesigning saved views' data model.
- Adding filter UI to My Work.

## Git workflow

- One commit: `fix(views): stop leaking global filters into my-work and project save-view`

## Steps

### Step 1: Disable hidden filters on My Work

In `my-work.tsx`, add `applyIssueFilters={false}` to the `IssuesWorkspace` props (matching the project tab's contract). Recommended default decision: My Work shows unfiltered personal data; if the maintainer prefers visible filter chips instead, STOP and ask.

**Verify**: `grep -n "applyIssueFilters" src/routes/my-work.tsx` → present with `false`.

### Step 2: Save empty filters from the project surface

Determine how the dialog knows its surface: read `saved-view-dialog.tsx` props and its open triggers (`project-detail-overview.tsx` toolbar vs workspace header). Pass an explicit prop like `captureFilters?: boolean` (default `true`). From the project toolbar trigger, pass `captureFilters={false}` and have the dialog persist `{}`/defaults for `filters` in that case while still saving display config and scope.

**Verify**: `bun run build && bun run lint` → exit 0.

## Test plan

No test suite. Manual matrix:

1. Set a status filter on `/issues`; visit My Work → list unfiltered.
2. On `/projects/<slug>?tab=issues`, click Save view → created view contains no hidden filters (inspect via applying it on `/issues`).
3. Saving a view from `/issues` still captures current filters (regression).

## Done criteria

- [ ] My Work ignores global filters
- [ ] Views saved from the project tab carry no invisible filters
- [ ] Views saved from `/issues` unchanged
- [ ] Build + lint pass; only two files changed
- [ ] `plans/README.md` status row updated

## STOP conditions

- The dialog cannot distinguish surfaces via props without refactoring its parent chain beyond these files — report the component graph found.
- Maintainer declines the Step 1 default.

## Maintenance notes

If My Work grows its own filter UI later, revisit both decisions. Reviewer should confirm the default-value approach keeps existing call sites working without edits.
