# Plan 015: Eliminar lost updates en los toggles de filtros y preferencias de vista

> **Executor instructions**: Follow this plan step by step. STOP conditions below.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- store/ src/data/viewer.ts convex/viewer.ts`
> Mismatch → STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED (touches preference plumbing used across display/settings surfaces)
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

Filter/display toggles are read-modify-write over the render-time snapshot of Convex-backed preferences, sent as full-array mutations with no optimistic update. Two rapid toggles of the same type read the same stale value; the second write overwrites the first and that click is silently lost. Affects `useFilterStore.toggleFilter` and the twin stores (`projects-filter-store.ts`, `view-store.ts toggleProperty`, `projects-view-store.ts`). With latency, multi-selecting statuses keeps only the last one.

## Current state

- `store/filter-store.ts:11-33`: merges `preferences?.issueFilters` over defaults, computes next array from that snapshot, calls `updatePreferences({ issueFilters: { [type]: ids } })`.
- `src/data/viewer.ts:16-21`: plain `useMutation(api.viewer.updatePreferences)` — no optimistic write.
- `convex/viewer.ts:317-319`: server merge is per-key, so patching a single key client-side is consistent with server semantics.

Constraint from AGENTS.md: **no Zustand caches for remote data** — the fix must overlay TanStack Query's cache (`queryClient.setQueryData`) or buffer pending ops, not duplicate state in Zustand.

Note: `src/data/viewer.ts:14,18` uses `useQuery` from `convex/react` while the rest of the app uses `@convex-dev/react-query`. Unifying this to the TanStack-managed channel is REQUIRED by this plan so `setQueryData` has a single cache to patch.

## Commands you will need

| Purpose     | Command                    | Expected        |
| ----------- | -------------------------- | --------------- |
| Build       | `bun run build`            | exit 0          |
| Lint        | `bun run lint`             | exit 0          |
| React check | `bunx react-doctor@latest` | no new findings |

## Scope

**In scope**:

- `src/data/viewer.ts`
- `store/filter-store.ts`, `store/projects-filter-store.ts`, `store/view-store.ts`, `store/projects-view-store.ts`

**Out of scope**:

- `convex/viewer.ts` server logic (merge is correct).
- Components consuming these stores (their API must stay identical).
- Other preferences fields beyond filters/view config.

## Git workflow

- One commit per logical unit or single commit: `fix(preferences): apply optimistic updates to filter and view toggles`

## Steps

### Step 1: Unify the viewer data channel

In `src/data/viewer.ts`, replace `useQuery` from `convex/react` with the repo-standard pattern used elsewhere (see any other module under `src/data/*` importing `convexQuery` from `@convex-dev/react-query` + `useSuspenseQuery`/`useQuery` from `@tanstack/react-query`). Keep exported hook signatures identical.

### Step 2: Add optimistic patching for preference writes

Extend `updatePreferences` usage into an optimistic wrapper (inside `src/data/viewer.ts`), e.g.:

```ts
export function useUpdatePreferences() {
   const queryClient = useQueryClient();
   const mutate = useMutation(api.viewer.updatePreferences);
   return useCallback(
      (patch: Partial<ViewerPreferences>) => {
         const key = viewerPreferencesQuery().queryKey; // reuse the existing query-options factory
         queryClient.setQueryData(key, (prev) => deepMergePreferences(prev, patch)); // optimistic
         return mutate(patch); // server reconciles per-key; refetch confirms
      },
      [queryClient, mutate]
   );
}
```

Implement `deepMergePreferences` honoring the same per-key semantics as `convex/viewer.ts:317-319` (arrays replace wholesale, scalars overwrite, nested `issueFilters`/display objects merge per field). On mutation settle without error, invalidate or rely on the push update — verify which happens today by reading how the query is configured.

### Step 3: Point all four stores at the wrapper

Swap each store's raw `updatePreferences(...)` call to the new hook. Because stores are plain hooks, call `useUpdatePreferences()` at their top level. No signature changes.

**Verify**: `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "store/|src/data/viewer"` → clean.

### Step 4: Verify

`bun run build && bun run lint && bunx react-doctor@latest`.

## Test plan

No test suite. Manual race simulation: DevTools network throttling (Slow 3G) on `/issues`; click three status filters quickly → after settle, all three persist (check persisted prefs via reload). Repeat in Display menu property toggles. Also confirm no infinite refetch loop appears (react-doctor + Network tab).

## Done criteria

- [ ] Rapid toggles never lose clicks (throttled manual test)
- [ ] Single subscription channel for viewer preferences
- [ ] No Zustand state holds remote preference data (AGENTS.md invariant)
- [ ] Build/lint/react-doctor clean
- [ ] Only in-scope files changed
- [ ] `plans/README.md` status row updated

## STOP conditions

- The convex-react → TanStack swap breaks SSR/hydration in ways visible in build output — report.
- `viewerPreferencesQuery()` isn't exposed as query-options factory (report its actual shape before inventing keys).

## Maintenance notes

Any new preference field gets the same semantics automatically via the shared merger. Reviewer should scrutinize `deepMergePreferences` against the server merge — divergence means UI optimism lying about persistence.
