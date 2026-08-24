# Plan 016: No pisar la salud actual del proyecto al editar un update histórico

> **Executor instructions**: Follow this plan step by step. STOP conditions below. This plan encodes a recommended product decision — confirm with maintainer if it surfaces during review.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- convex/projects.ts`
> Mismatch → STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

`updateProjectUpdate` unconditionally patches `project.health`/`attention` with the edited update's values (`convex/projects.ts:1056-1060`). Editing the body of update #1 of 5 rewinds the project's currently visible health (used by `serializeProject`/`listProjects`, see `convex/projects.ts:159`) to that old snapshot. "Last write wins" is reasonable for a NEW update; applying it to edits of OLD updates looks unintentional.

## Current state

```ts
// convex/projects.ts, inside updateProjectUpdate (~1040-1061)
await ctx.db.patch(updateId, {
   health: input.health,
   attention: input.attention ?? update.attention,
   body: input.body,
   areaMentions,
   updatedAt: now,
});
await ctx.db.patch(update.projectId, {
   health: input.health,
   attention: input.attention ?? update.attention,
   updatedAt: now,
});
```

Updates carry `createdAt`; check whether a helper like `getLatestProjectUpdate` exists in the file — if not, one query with `by_project_createdAt` index + `.order('desc').first()` provides the latest.

## Commands you will need

| Purpose | Command               | Expected |
| ------- | --------------------- | -------- |
| Build   | `bun run build`       | exit 0   |
| Lint    | `bun run lint`        | exit 0   |
| Push    | `bun run convex:push` | exit 0   |

## Scope

**In scope**:

- `convex/projects.ts` (`updateProjectUpdate` only)

**Out of scope**:

- `createProjectUpdate` (its sync is correct).
- Health display logic.
- `deleteProjectUpdate` behavior (verify only: if deleting the latest update also rewinds health, note it in Maintenance — do NOT fix here).

## Git workflow

- One commit: `fix(projects): keep current health when editing non-latest project update`

## Steps

### Step 1: Guard the project patch

Before the second `ctx.db.patch`, determine whether `updateId` is still the project's latest update:

```ts
const latest = await ctx.db
   .query('projectUpdates')
   .withIndex('by_project_createdAt', (q) => q.eq('projectId', update.projectId))
   .order('desc')
   .first();

if (latest && latest._id === updateId) {
   await ctx.db.patch(update.projectId, { ... });
}
```

(Confirm index name from schema; adapt if `.first()` semantics differ.)

**Verify**: `bun run build && bun run lint && bun run convex:push` → exit 0.

## Test plan

No test suite. Manual: publish two updates (healthy then at-risk). Edit the FIRST update's body only → project health must remain at-risk. Edit the LATEST update's health → project health follows (regression check).

## Done criteria

- [ ] Editing a non-latest update never changes project health
- [ ] Creating/editing the latest update behaves exactly as before
- [ ] Build/lint/push pass; single file changed
- [ ] `plans/README.md` status row updated

## STOP conditions

- Excerpt differs (e.g. sync already guarded).
- Maintainer states "editing old updates should re-apply their health" — record decision and close REJECTED.

## Maintenance notes

If `deleteProjectUpdate` removes the latest update and leaves stale project health, that's a sibling bug — file it separately rather than expanding this diff.
