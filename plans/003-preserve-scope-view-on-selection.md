# Plan 003: Preservar `scope` y `view` en la URL al seleccionar o cerrar un issue

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in "STOP conditions" occurs, stop and report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- components/common/issues/issues-workspace.tsx components/common/projects/project-detail-overview.tsx src/routes/issues.tsx src/routes/projects.\$projectSlug.tsx`
> On any change, compare excerpts against live code; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

Both issue surfaces rebuild the URL when selecting or closing an issue and drop the `scope` (active/backlog/all) and `view` (saved view id) search params. Result: with a scope or saved view active, clicking an issue resets the list behind the detail panel to scope "all" without the view. AGENTS.md mandates that `/issues` and `/projects/$projectSlug?tab=issues` behave identically; `header-nav.tsx:136-139` already preserves these params on scope links, so this fix makes selection consistent with existing behavior.

## Current state

Route search schemas already declare both params:

- `src/routes/issues.tsx:15-19`: `{ projectId?, scope? ('active'|'backlog'|'all', .catch('all')), view? }`
- `src/routes/projects.$projectSlug.tsx:15-20`: `{ tab?, issue?, scope?, view? }` (same enum)
- `src/routes/issues.$issueIdentifier.tsx`: no `validateSearch` — it passes search params through untouched.

Broken navigation #1 — `components/common/issues/issues-workspace.tsx` (`handleSelectIssue`, ~lines 713–740; there are three `navigate({ to: '/issues'... })`/`navigate({ to: '/issues/$issueIdentifier'... })` calls with identical shape):

```ts
runSelectionChange(issue.identifier, () =>
   navigate({
      to: '/issues/$issueIdentifier',
      params: { issueIdentifier: issue.identifier },
      search: projectFilterId ? { projectId: projectFilterId } : {},
   })
);
```

Broken navigation #2 — `components/common/projects/project-detail-overview.tsx:357-372`:

```ts
const handleSelectIssue = (issue: Issue) => {
   return router.navigate({
      to: '/projects/$projectSlug',
      params: { projectSlug: project.slug },
      search: { tab: 'issues', issue: issue.identifier },
   });
};
const handleClearSelectedIssue = () => {
   return router.navigate({
      to: '/projects/$projectSlug',
      params: { projectSlug: project.slug },
      search: { tab: 'issues' },
      replace: true,
   });
};
```

Exemplar of preserving params (TanStack Router supports function-form `search` receiving previous search): see how `components/layout/headers/header-nav.tsx:136-139` builds scope links keeping current params.

## Commands you will need

| Purpose     | Command                    | Expected        |
| ----------- | -------------------------- | --------------- |
| Build       | `bun run build`            | exit 0          |
| Lint        | `bun run lint`             | exit 0          |
| React check | `bunx react-doctor@latest` | no new findings |

Note: editing route-related files regenerates `src/routeTree.gen.ts`; that file is gitignored by Prettier and its churn is expected.

## Scope

**In scope**:

- `components/common/issues/issues-workspace.tsx` (the three selection/clearing `navigate` calls)
- `components/common/projects/project-detail-overview.tsx` (`handleSelectIssue`, `handleClearSelectedIssue`)

**Out of scope**:

- Route files (`src/routes/**`) unless type errors force a schema touch — prefer not.
- `header-nav.tsx` — already correct; use only as reference.
- Any change to what `issue` param contains.

## Git workflow

- One commit: `fix(issues): preserve scope and view search params across issue selection`

## Steps

### Step 1: Fix the workspace navigations

In `issues-workspace.tsx`, change each of the three object-form `search` values from

```ts
search: projectFilterId ? { projectId: projectFilterId } : {};
```

to function form merging previous search:

```ts
search: (prev: Record<string, unknown>) => ({
   ...(projectFilterId ? { projectId: projectFilterId } : {}),
   scope: prev.scope,
   view: prev.view,
});
```

Apply the same shape to the `to: '/issues'` clear-navigation call. TypeScript will infer precise types if you omit the explicit annotation — do whichever compiles cleanly without casts.

**Verify**: `bun run build` → exit 0 (TanStack Router types validate the search function).

### Step 2: Fix the project-tab navigations

In `project-detail-overview.tsx`, change both handlers to merge previous search:

```ts
const handleSelectIssue = (issue: Issue) => {
   return router.navigate({
      to: '/projects/$projectSlug',
      params: { projectSlug: project.slug },
      search: (prev) => ({
         tab: 'issues' as const,
         issue: issue.identifier,
         scope: prev.scope,
         view: prev.view,
      }),
   });
};

const handleClearSelectedIssue = () => {
   return router.navigate({
      to: '/projects/$projectSlug',
      params: { projectSlug: project.slug },
      search: (prev) => ({ tab: 'issues' as const, scope: prev.scope, view: prev.view }),
      replace: true,
   });
};
```

**Verify**: `bun run build && bun run lint` → both exit 0.

## Test plan

No test suite exists. Manual verification (both surfaces, per AGENTS.md):

1. `/issues?scope=backlog` → click an issue → URL must remain `scope=backlog`.
2. `/issues?view=<id>` → click → `view=<id>` preserved.
3. Same two checks on `/projects/<slug>?tab=issues&scope=backlog`.
4. Close the detail panel → params still preserved.

## Done criteria

- [ ] `bun run build && bun run lint` exit 0
- [ ] No object-form `search:` dropping `scope` remains in the two files (`grep -n "search: {" components/common/issues/issues-workspace.tsx components/common/projects/project-detail-overview.tsx` returns nothing for these handlers)
- [ ] Manual matrix above passes (or greps + build pass for headless executor)
- [ ] No out-of-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The excerpts do not match live code.
- Function-form `search` fails TanStack Router typing in a way that requires `as any` or new zod schemas — report instead of casting.

## Maintenance notes

Any future surface that renders `IssuesWorkspace` with inline navigation inherits the fix via the shared component. Reviewer should confirm the detail route still receives `issueIdentifier` correctly after the change.
