# Plan 002: Eliminar la llamada al setter inexistente `setEditingDescription` en el overview de proyecto

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in "STOP conditions" occurs, stop and report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- components/common/projects/project-detail-overview.tsx`
> On any change, compare the excerpts below against live code; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

The "Description" toggle button in the project overview calls `setEditingDescription(true)`, but no such state exists in that component (it exists in `components/common/issues/issue-detail.tsx` for issues). Clicking the button throws `ReferenceError: setEditingDescription is not defined` at runtime. Vite's build does not typecheck this file's JSX handlers, so it compiles fine and crashes only on click. The description below the button is already editable via `InlineEditableText`, so the button is a broken leftover.

## Current state

- `components/common/projects/project-detail-overview.tsx` — project overview tab; contains the broken button.

Excerpt (`project-detail-overview.tsx:536-555`):

```tsx
<section className="mt-8 border-t pt-5">
   <button
      type="button"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
      onClick={() => setEditingDescription(true)}
   >
      Description
      <span className="text-xs">⌄</span>
   </button>
   <div className="mt-3 max-w-5xl whitespace-pre-wrap text-sm leading-6 text-foreground">
      <InlineEditableText
         value={project.description || ''}
         ...
```

`grep -n 'editingDescription' components/common/projects/project-detail-overview.tsx` returns exactly one hit: line 540. The editing affordance already lives in the sibling `InlineEditableText` component rendered directly below.

## Commands you will need

| Purpose     | Command                    | Expected on success         |
| ----------- | -------------------------- | --------------------------- |
| Build       | `bun run build`            | exit 0                      |
| Lint        | `bun run lint`             | exit 0                      |
| React check | `bunx react-doctor@latest` | no new findings vs baseline |

## Scope

**In scope**:

- `components/common/projects/project-detail-overview.tsx` (the button block only)

**Out of scope**:

- `components/common/issues/issue-detail.tsx` — its `editingDescription` state is correct where it is.
- Any restyle or redesign of the description section; visual language must stay identical (see AGENTS.md Styling).

## Git workflow

- One commit: `fix(projects): remove broken description edit button that crashed on click`

## Steps

### Step 1: Remove the dead button

Delete the entire `<button ...>` element (the one with `onClick={() => setEditingDescription(true)}`, including its "Description" label and chevron span) from `project-detail-overview.tsx`. Keep the surrounding `<section>` and the `<div>` with `InlineEditableText` untouched — that is the real editing surface.

**Verify**: `grep -n 'setEditingDescription' components/common/projects/project-detail-overview.tsx` → no matches.

### Step 2: Verify build and React health

Run `bun run build && bun run lint && bunx react-doctor@latest`.

**Verify**: build and lint exit 0; react-doctor reports no new issue attributable to this file.

## Test plan

No test suite exists. Manual verification path: run `bun run dev`, open `/projects/<slug>` overview tab, confirm the section renders without the button and inline description editing still works. (Executor without a browser: greps + build are the gate.)

## Done criteria

- [ ] `bun run build && bun run lint` exit 0
- [ ] No occurrence of `setEditingDescription` in `components/common/projects/`
- [ ] The `<InlineEditableText>` description block is unchanged
- [ ] No files outside scope modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- Line 540 area does not match the excerpt (drift).
- Removing the button leaves an unused import (e.g. if some import becomes unused, fix it in the same commit — this is allowed; anything else is a STOP).

## Maintenance notes

If product later wants a dedicated edit mode for project descriptions, add proper local state modeled after `issue-detail.tsx:202` rather than re-adding a handler to nonexistent state.
