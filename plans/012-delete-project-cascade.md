# Plan 012: Reutilizar la limpieza en cascada de `issues.remove` al eliminar un proyecto con issues

> **Executor instructions**: Follow this plan step by step. STOP conditions below.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- convex/projects.ts convex/issues.ts`
> Mismatch → STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (change is inside an already-destructive operation)
- **Depends on**: none hard; do after Plan 010 to avoid merge friction in `convex/issues.ts`
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

`deleteProject` with mode "delete issues" removes each issue via bare `ctx.db.delete(issue._id)` (`convex/projects.ts:1382`), while `issues.remove` (`convex/issues.ts:1420-1462`) performs the full cascade: reparent children, delete outgoing/incoming `issueRelations` (both directions — cross-project blockers included), comments, activity, and artifacts. The project path leaves permanent orphans that pollute global collects of `issueRelations` forever and dangle `parentIssueId` references.

## Current state

- `convex/projects.ts` (~line 1382):

```ts
} else {
   await Promise.all(issues.map((issue) => ctx.db.delete(issue._id)));
}
```

- `convex/issues.ts` `remove` mutation (~1418–1462): fetches children (`by_parent_issue`), patches them `{ parentIssueId: undefined, updatedAt }`; deletes relations by both indexes (`by_blocker`, `by_blocked`); deletes comments/activity/artifacts by `by_issue_createdAt`; then deletes the issue.
- Both files share the same `MutationCtx` type; a module-level async helper in `convex/issues.ts` exported for `projects.ts` matches existing cross-file patterns (`listOptions` imported from `./projects` into `issues.ts` already).

## Commands you will need

| Purpose | Command               | Expected |
| ------- | --------------------- | -------- |
| Build   | `bun run build`       | exit 0   |
| Lint    | `bun run lint`        | exit 0   |
| Push    | `bun run convex:push` | exit 0   |

## Scope

**In scope**:

- `convex/issues.ts` (extract + export cascade helper; `remove` refactored to use it)
- `convex/projects.ts` (call helper in the delete branch)

**Out of scope**:

- The `'unlink'` mode branch (patches are correct).
- Soft-delete/archival semantics.
- Any UI confirmation flow.

## Git workflow

- One commit: `fix(projects): reuse issue removal cascade when deleting project issues`

## Steps

### Step 1: Extract the cascade

In `convex/issues.ts`, add above the mutations:

```ts
export async function removeIssueCompletely(ctx: MutationCtx, issueId: Id<'issues'>) {
   // move body of `remove` here verbatim, minus the initial get/early-return
}
```

Refactor `export const remove = mutation(...)` handler to:

```ts
const issue = await ctx.db.get(id);
if (!issue) return false;
await removeIssueCompletely(ctx, id);
return true;
```

**Verify**: `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep convex/` → clean.

### Step 2: Call it from deleteProject

Replace the delete branch:

```ts
} else {
   await Promise.all(issues.map((issue) => removeIssueCompletely(ctx, issue._id)));
}
```

Add `import { removeIssueCompletely } from './issues';` to `convex/projects.ts`. Watch for circular imports: `issues.ts` imports `listOptions` from `./projects`. Convex bundler tolerates mutual imports between function modules, but if lint/build complains, move the shared helper into a third file `convex/issueCleanup.ts` instead — prefer that proactively if you see any cycle risk.

### Step 3: Verify

Run `bun run build && bun run lint && bun run convex:push`.

**Verify**: all exit 0.

## Test plan

No test suite. Manual on dev data (use a throwaway project): create project P with issue A (child B), blocker relation A↔issue X in another project, one comment on A. Delete P with issues. Verify in dashboard: `issueRelations` has no rows referencing A; B exists with no parent; comment gone; X's blocking view updated.

## Done criteria

- [ ] Deleting a project leaves zero orphan rows in issueRelations/comments/activity/artifacts
- [ ] Children reparented before deletion
- [ ] Build, lint, push pass
- [ ] Only two (or three with cleanup module) in-scope files changed
- [ ] `plans/README.md` status row updated

## STOP conditions

- Circular import breaks the build and the third-file extraction also fails — report.
- `deleteProject`'s excerpt differs materially (e.g. it now batches differently).

## Maintenance notes

Any new child table added to issues (e.g. future attachments beyond artifacts) must be added to `removeIssueCompletely` — single point of truth now, keep it that way. Reviewer should confirm the unlink branch untouched.
