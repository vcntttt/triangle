# Plan 005: Rechazar renombres de etiqueta que colisionen con un nombre existente

> **Executor instructions**: Follow this plan step by step. STOP conditions below.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- convex/labels.ts`
> Mismatch with excerpts → STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

`labels.create` rejects duplicate names via the `by_name` index, but `labels.update` does not check anything, so two labels can end up with the same name. Downstream, `findLabelsByNames` (`convex/issues.ts:79-84`) matches by plain name and is used when creating/updating issues with `labelNames` (e.g. from MCP) — duplicates produce ambiguous attachment of labels.

## Current state

- `convex/labels.ts` — label mutations.

`create` guard (`convex/labels.ts:~25-31`):

```ts
if (
   await ctx.db
      .query('labels')
      .withIndex('by_name', (q) => q.eq('name', name))
      .unique()
)
   throw new Error('A label with this name already exists.');
```

`update` today (`convex/labels.ts:43-47`) — no uniqueness check:

```ts
const label = await ctx.db.get(id);
if (!label) throw new Error('Label not found.');
await ctx.db.patch(id, {
   ...(input.name ? { name: input.name.trim() } : {}),
   ...(input.color ? { color: input.color } : {}),
});
```

## Commands you will need

| Purpose | Command         | Expected |
| ------- | --------------- | -------- |
| Build   | `bun run build` | exit 0   |
| Lint    | `bun run lint`  | exit 0   |

## Scope

**In scope**:

- `convex/labels.ts` (`update` mutation only)

**Out of scope**:

- `create`, `remove`, issue-side `findLabelsByNames`.
- Case-sensitivity policy changes (match `create`'s exact-match semantics).

## Git workflow

- One commit: `fix(labels): reject renames that collide with existing label names`

## Steps

### Step 1: Add the collision guard to `update`

Inside `update`, after fetching `label`, compute `const nextName = input.name?.trim();` then before the patch:

```ts
if (nextName && nextName !== label.name) {
   const clash = await ctx.db
      .query('labels')
      .withIndex('by_name', (q) => q.eq('name', nextName))
      .unique();
   if (clash) throw new Error('A label with this name already exists.');
}
```

Use `nextName` in the patch spread instead of re-trimming (`...(nextName ? { name: nextName } : {})`). Keep the error message identical to `create`'s so UI handling matches.

**Verify**: `bun run build && bun run lint` → exit 0.

## Test plan

No test suite. Manual (needs dev deployment): create labels "a" and "b"; rename "b" → "a" must fail with the duplicate-name error; rename "b" → "b" (no-op) and "b" → "c" must succeed.

## Done criteria

- [ ] `update` rejects colliding names with `create`'s message
- [ ] Renaming a label to its own current name still works
- [ ] `bun run build && bun run lint` exit 0; only `convex/labels.ts` changed
- [ ] `plans/README.md` status row updated

## STOP conditions

- Excerpts don't match.
- `by_name` index does not exist in `convex/schema.ts` under that name.

## Maintenance notes

If label names ever become case-insensitive or scoped per project, both `create` and `update` guards change together — keep them in lockstep.
