# Plan 011: Tolerar ids de URL malformados en las queries de la página de issues

> **Executor instructions**: Follow this plan step by step. STOP conditions below.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- src/data/saved-views.ts src/data/issues.ts src/routes/issues.tsx`
> Mismatch → STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

URL-provided ids reach Convex as blind casts: `src/data/saved-views.ts:29,35` cast `projectId`/`viewId`, and `src/data/issues.ts:7-13` passes any `projectId` string through to a query that casts to `Id<'projects'>` and uses it in an index. A hand-edited or stale URL like `/issues?projectId=<basura>` makes the query throw an id-validation error inside the route loader's `ensureQueryData` (`src/routes/issues.tsx:24`) — breaking the whole page instead of degrading to "no filter". Same for `?view=<garbage>` leaving the saved-view query in an unhandled error state.

## Current state

- `src/routes/issues.tsx:24` — loader: `context.queryClient.ensureQueryData(issuesPageQuery(deps))`; search schema at 15–19 accepts any string for `projectId`/`view`.
- `src/data/issues.ts:7-13` — `issuesPageQuery(args)` builds a Convex query keyed with raw strings.
- `src/data/saved-views.ts:29,35`:

```ts
return convexQuery(api.savedViews.list, {
   target: args.target,
   projectId: args.projectId as Id<'projects'> | undefined,
});
export function savedViewQuery(viewId?: string) {
   return convexQuery(api.savedViews.get, { viewId: viewId as Id<'savedViews'> });
}
```

Convex ids are opaque base32-ish strings; there is no public regex contract, so do NOT hand-roll format validation. The robust approach is catching/short-circuiting at the query layer.

## Commands you will need

| Purpose | Command         | Expected |
| ------- | --------------- | -------- |
| Build   | `bun run build` | exit 0   |
| Lint    | `bun run lint`  | exit 0   |

## Scope

**In scope**:

- `src/data/saved-views.ts`
- `src/data/issues.ts`
- `src/routes/issues.tsx` (only if loader needs try/catch)

**Out of scope**:

- Zod search schemas (keep accepting strings; degrade later, don't reject navigation).
- Other routes' loaders.
- Server-side validation in `convex/**` (functions already validate their own args).

## Git workflow

- One commit: `fix(issues): tolerate invalid project/view ids in URLs`

## Steps

### Step 1: Add a shared guard helper

In `src/data/saved-views.ts` (or a tiny new `src/data/id-guard.ts` if both modules importing from one another would be awkward — check import direction; `issues.ts` must not import from `saved-views.ts`):

```ts
const CONVEX_ID_RE = /^[a-z0-9]{16,64}$/i;
export const asConvexId = (value: string | undefined): string | undefined =>
   value && CONVEX_ID_RE.test(value) ? value : undefined;
```

The exact bounds are a sanity filter, not a security boundary — anything failing it is definitely not a Convex id.

### Step 2: Apply at the data boundaries

- `savedViewQuery(viewId)`: pass `{ viewId: asConvexId(viewId) }` — and make the query options object skip the query entirely when undefined (inspect how other optional-id queries in `src/data/*` handle "disabled"; TanStack Query's `enabled: false` via `convexQuery` may not exist — mirror whatever pattern `savedViewQuery(undefined)` currently relies on; if it already handles undefined by fetching nothing, just sanitize).
- `savedViewsQuery`: same for `projectId`.
- `issuesPageQuery`: sanitize `args.projectId` before building the query and before computing its query key so cache keys stay consistent.

**Verify**: `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "src/(data|routes)"` → clean (or only pre-existing errors unrelated to your diff).

### Step 3: Loader resilience

If after sanitization the loader can still throw (e.g. valid-format id of a deleted project), wrap `ensureQueryData(issuesPageQuery(deps))` in try/catch returning `undefined`, and confirm `IssuesLayout` already tolerates missing page data via its existing `isConnected`/`databaseError` handling — read that component first; adapt minimally.

**Verify**: `bun run build && bun run lint` → exit 0.

## Test plan

No test suite. Manual matrix: `/issues?projectId=zzzz` renders the unfiltered list (no crash); `/issues?view=zzzz` renders without saved view; normal `/issues?projectId=<real>` still filters; project tab unaffected.

## Done criteria

- [ ] Garbage ids never reach Convex functions from these queries
- [ ] Page renders with sanitized-out params
- [ ] `bun run build && bun run lint` exit 0
- [ ] Only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- `convexQuery` has no mechanism to disable/skip on falsy args and forcing one requires changing library usage patterns broadly — report what you found.
- Existing code already sanitizes somewhere else (then this plan reduces to aligning call sites).

## Maintenance notes

If TanStack Router gains param-level validation conventions in this repo, move the guard there. Reviewer should verify query-key stability: sanitized and unsanitized values must not create duplicate cache entries for the same logical query.
