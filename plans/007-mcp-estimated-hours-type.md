# Plan 007: Alinear el tipo declarado de `estimatedHours` en execution-path con el payload real

> **Executor instructions**: Follow this plan step by step. STOP conditions below.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- mcp/execution-path.ts convex/issues.ts`
> Mismatch → STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

The backend stores `estimatedHours` as a string (`input.estimatedHours.toString()` at `convex/issues.ts:657-660`) and serializes it as-is (`convex/issues.ts:295`, via `toNullable`). But the MCP execution-path interface declares it `number | null` (`mcp/execution-path.ts:9`) — so MCP consumers receive a string typed as a number. Any arithmetic (summing estimates to plan stages) yields concatenation or NaN. The type boundary lies.

## Current state

- `mcp/execution-path.ts` — builds the agent-facing execution path payload. Line 9: `estimatedHours: number | null;`. Line 116 copies the field verbatim from the serialized issue.
- `convex/issues.ts:660` — persists as string; line 295 serializes without conversion (`toNullable(issue.estimatedHours)`).

Decision for this plan: fix the declaration to match reality (`string | null`). Converting backend storage to numbers would touch schema, serializers, UI display, and MCP args — out of scope (see Maintenance).

## Commands you will need

| Purpose | Command         | Expected |
| ------- | --------------- | -------- |
| Build   | `bun run build` | exit 0   |
| Lint    | `bun run lint`  | exit 0   |

## Scope

**In scope**:

- `mcp/execution-path.ts` (the interface field only)

**Out of scope**:

- Convex schema/storage format of `estimatedHours`.
- `mcp/server.ts` argument schemas (they already accept `number | null` input, which is correct on the write side).
- Any consumer-side parsing of the value.

## Git workflow

- One commit: `fix(mcp): correct estimatedHours type in execution-path payload`

## Steps

### Step 1: Correct the declaration

In `mcp/execution-path.ts:9` change:

```ts
estimatedHours: number | null;
```

to:

```ts
estimatedHours: string | null;
```

Then run `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -i execution-path` — if any code in `execution-path.ts` performed numeric operations on this value, those lines will surface; adjust them to parse explicitly (`Number(issue.estimatedHours)`) only if such usage exists.

**Verify**: `bun run build && bun run lint` → exit 0; no tsc errors mentioning `execution-path`.

## Test plan

No test suite. Executable check that the wire value is a string when set: create an issue with `estimatedHours: 5` via MCP or Convex dashboard, then read the execution path output and confirm `typeof estimatedHours === 'string'` matches the declared type.

## Done criteria

- [ ] Declaration reads `string | null`
- [ ] No numeric operations on the field remain untyped in `execution-path.ts`
- [ ] `bun run build && bun run lint` exit 0
- [ ] Only `mcp/execution-path.ts` modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- tsc reveals broad consumers relying on `number` across many files — report the list instead of fixing them all here.

## Maintenance notes

Root cause is storage-as-string in Convex. If that ever migrates to numeric storage, revert this declaration and delete `toString()` at `convex/issues.ts:660` in the same change.
