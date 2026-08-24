# Plan 018: Dejar `tsc --noEmit` en cero errores (serializadores, ids y componentes UI)

> **Executor instructions**: Follow step by step; run verification per cluster. STOP conditions below. SKIP plans/README.md updates — reviewer maintains the index.
>
> **Drift check**: requires Plan 017 DONE. Run `bun run typecheck` first and compare against the inventory below (counts ±2 acceptable as 017 may shift a few); large divergence → STOP and report.

## Status

- **Priority**: P1 | **Effort**: M | **Risk**: MED (many small edits; must be behavior-neutral) | **Depends on**: plans/017 | **Category**: dx
- **Planned at**: commit `31daefd`, 2026-08-23

## Why this matters

After 017, ~30 TS errors remain across three themes, all of which mean the compiler was overruled somewhere real:

1. **Id boundaries**: plain `string` passed where Convex branded `Id<'projects'> | Id<'labels'> | Id<'savedViews'> | Id<'issueAutomations'>` is expected — the type system can't see that these strings came from serialized docs.
2. **Serializer/compat-surface mismatches**: `lib/db`-era types (`ProjectLike.iconType`, `Status.icon`, unions `ProjectOptionLike | Status`) don't match what the current serializers produce (`src/data/*`), forcing components into impossible states.
3. **UI typing drift**: missing exports (`ButtonProps`), wrong event-handler types, drag-ref mismatch, a `never` narrowing bug.

Goal: zero errors from `bun run typecheck`, with **no runtime behavior changes**.

## Inventory (from commit `31daefd`; fix each, verify with targeted grep)

Theme 1 — Id boundaries (mechanical: thread `Id<...>` through props/calls or cast AT the serialization boundary where the doc id genuinely originates; prefer retyping props over casting call sites):

- `components/common/projects/project-board-card.tsx:68`, `project-line.tsx:74` — string → `Id<'projects'>`
- `components/layout/sidebar/nav-workspace.tsx:41-42` — same
- `components/layout/sidebar/customize-sidebar-dialog.tsx:81` — string vs literal union key
- `components/common/settings/automations-settings.tsx:69,93,108` — string → `Id<'issueAutomations'>`; also :79 `AutomationInput` shape vs mutation args
- `components/layout/sidebar/nav-saved-views.tsx:47` — passes `Id` where `{ viewId }` object expected (wrong arg shape)

Theme 2 — Serializer mismatches:

- `lib/issues-presentation.ts:43,45,52,57` — functions typed against `Status`/`Priority`/`ProjectLike` but fed serializer output typed `ProjectOptionLike | Status` etc. READ `lib/db/*` type surface and `src/data/issues.ts` serializers; align the DECLARATIONS to the actual produced shapes (narrow the compat types or widen at one honest place). Do not invert by casting inputs to `any`.
- `src/routes/projects.$projectSlug.tsx:103`, `projects.index.tsx:16` — serialized project's `iconType: string` vs `ProjectLike['iconType']`. Fix at the source: make the serializer emit the union type (check how iconType is stored/validated in convex/projects.ts) rather than casting consumers.

Theme 3 — UI typing:

- `components/ui/button.tsx` lacks `ButtonProps` export used by `sidebar/create-new-issue/{area,project}-selector.tsx:4` — export the inferred variant props type (read how shadcn button is structured) instead of duplicating an interface in selectors.
- `sidebar/create-new-issue/index.tsx:95,126,132,567` — union `Project | LabelInterface` flowing where specific types needed (discriminate properly); keyboard handler typed for input attached to textarea (align handler generic).
- `components/common/projects/project-board-column.tsx:85` — react-dnd `ConnectDragSource` vs `Ref<HTMLDivElement>`: use the connector correctly (`(ref) => drag(ref)` pattern) rather than casting.
- `components/common/views/saved-view-dialog.tsx:99` — `existing?.filters` narrows to `never`: likely `SavedViewLike.filters` typed too narrowly vs `IssueFilters`; fix the declaration.
- `components/common/issues/group-issues.tsx:129` — `openModal(status, null, null)` third arg `null` vs `Project | undefined`: pass `undefined`.
- `convex/issues.ts:457` — `Id<'issues'>` cast to `Id<'issueActivity'>`: read surrounding code; if ids are genuinely different entities this is a latent logic smell — if the value IS an issue id being stored in activity, retype the field usage; only use `as unknown as` with a comment if truly intentional.

## Commands

| Purpose   | Command             | Expected            |
| --------- | ------------------- | ------------------- |
| Typecheck | `bun run typecheck` | exit 0, zero errors |
| Build     | `bun run build`     | exit 0              |
| Lint      | `bun run lint`      | exit 0              |

## Scope

**In scope**: the files listed above + `lib/db/*` declarations + `src/data/*` serializers ONLY where needed to make declarations truthful.
**Out of scope**: any runtime logic change; refactors beyond making types true; adding tests.

## Git workflow

One commit per theme (3 commits):

- `fix(types): thread convex ids through component boundaries`
- `fix(types): align serializer declarations with produced shapes`
- `fix(types): repair ui component typings`

## Steps

Work theme by theme; after EACH theme run `bun run build && bun run lint && bun run typecheck` and confirm the error count strictly decreases without new errors appearing elsewhere.

### Rules of engagement

- Prefer fixing declarations over silencing call sites.
- A cast is acceptable ONLY when the value's origin guarantees it (e.g. id came straight off a serialized doc) — then cast narrowly at that single line with a brief comment.
- No `as any`, no `@ts-ignore`, no `@ts-expect-error`.

## Done criteria

- [ ] `bun run typecheck` exits 0
- [ ] `grep -rn "as any\|@ts-ignore\|@ts-expect-error" <files you touched>` → no matches added
- [ ] Build + lint exit 0
- [ ] No runtime diffs beyond typing (inspect your own diff for behavior changes)

## STOP conditions

- Any fix would require changing runtime behavior (e.g. automations-settings input shape mismatch reveals a REAL bug in what it sends) — report it as a finding instead of fixing here.
- Theme 2 requires redesigning the lib/db compat surface beyond declaration tweaks — report the design question.

## Maintenance notes

With typecheck green, wire `bun run typecheck` into CI/pre-commit as follow-up. Reviewer should sample-check that "casts at boundaries" are genuinely at doc-origin points.
