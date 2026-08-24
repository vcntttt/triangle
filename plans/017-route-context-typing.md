# Plan 017: Tipar el contexto del router y eliminar la opción inválida del cliente Convex

> **Executor instructions**: Follow step by step; run every verification before moving on. STOP conditions below. SKIP plans/README.md updates — reviewer maintains the index.
>
> **Drift check**: `git diff --stat 31daefd..HEAD -- src/routes/__root.tsx src/router.tsx`
> Mismatch with excerpts → STOP.

## Status

- **Priority**: P1 | **Effort**: S | **Risk**: LOW-MED | **Depends on**: none | **Category**: dx
- **Planned at**: commit `31daefd`, 2026-08-23

## Why this matters

`bunx tsc --noEmit` reports 49 errors. The largest cluster (~18) comes from `src/routes/__root.tsx` using `createRootRoute({...})` without declaring the router context type, so every loader receives `context: {}` and `context.queryClient` / `context.convexClient` are TS2339. Separately, `src/router.tsx:21` passes `disabled` to `ConvexReactClient`, an option that does not exist in convex@1.42 (`ConvexReactClientOptions` = `BaseConvexClientOptions`: `unsavedChangesWarning`, `webSocketConstructor`, logging). This plan removes both error clusters and adds a durable `typecheck` gate.

Runtime safety of removing `disabled`: `ConvexReactClient`'s constructor does NOT construct a WebSocket (verified in `node_modules/convex/dist/esm/react/client.js` — connection is lazy via `cachedSync`, created on first use), and SSR queries run through `ConvexQueryClient`'s HTTP path, so dropping the ignored option is behavior-neutral.

## Current state

`src/routes/__root.tsx` (~line 12):

```ts
export const Route = createRootRoute({
   loader: ({ context }) =>
      Promise.all([
         context.queryClient.ensureQueryData(projectOptionsQuery()),
         ...
```

`src/router.tsx` (~lines 18–24):

```ts
const convexClient = new ConvexReactClient(convexUrl, {
   // SSR queries are executed through ConvexQueryClient's HTTP client.
   // Avoid constructing the browser WebSocket client in Node runtimes.
   disabled: typeof window === 'undefined',
   unsavedChangesWarning: false,
});
```

Consumers of `context.convexClient`: `src/routes/settings.tsx` (~line 15). All other route files use only `context.queryClient`.

TanStack Router API (v1.x): `createRootRouteWithContext<T>()({ ... })` declares the context type for the whole tree; `createRouter({ context })` must provide exactly `T`.

## Commands

| Purpose   | Command                                                          | Expected                    |
| --------- | ---------------------------------------------------------------- | --------------------------- |
| Build     | `bun run build`                                                  | exit 0                      |
| Lint      | `bun run lint`                                                   | exit 0                      |
| Typecheck | `bunx tsc --noEmit -p tsconfig.json 2>&1 \| grep -cE 'error TS'` | drops by ≥18 vs baseline 49 |

Note: baseline has other pre-existing errors (serializer mismatches etc.) — they are Plan 018's scope. Only require THIS plan's clusters to disappear.

## Scope

**In scope**:

- `src/routes/__root.tsx` (context typing)
- `src/router.tsx` (remove `disabled`)
- `package.json` (add `"typecheck": "tsc --noEmit"` script)

**Out of scope**:

- Any serializer/component type errors (Plan 018).
- Changing how SSR queries execute.

## Git workflow

One commit: `fix(router): type route context and drop invalid convex client option`

## Steps

### Step 1: Type the root route

In `__root.tsx` replace `createRootRoute(` with:

```ts
import { createRootRouteWithContext } from '@tanstack/react-router';
import type { ConvexReactClient } from 'convex/react';
import type { QueryClient } from '@tanstack/react-query';

interface RouterContext {
   queryClient: QueryClient;
   convexClient: ConvexReactClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
   ...unchanged options...
});
```

(Keep existing imports organized per file style.) If the root route previously passed options like `head`/`component`, keep them identical inside the new call.

### Step 2: Fix router.tsx

Delete the `disabled` line and its comment; keep `unsavedChangesWarning: false`. Update the stale comment above the constructor call if needed to reflect reality: the WS client connects lazily and SSR queries use the HTTP path.

### Step 3: Add the typecheck script

In `package.json` scripts add `"typecheck": "tsc --noEmit",` next to `lint`. Also add one line to `AGENTS.md` under `## Verification`: after the build+lint sentence, note `- Typecheck: \`bun run typecheck\`.`

**Verify**: `bun run typecheck 2>&1 | grep -cE 'error TS'` → ≤31 (49 − 18); specifically `grep -E "__root|settings.tsx.*convexClient|router.tsx" <<< "$(bunx tsc --noEmit -p tsconfig.json 2>&1)"` → empty. Then `bun run build && bun run lint` → exit 0.

## Done criteria

- [ ] Zero TS2339 `queryClient`/`convexClient`-on-`{}` errors
- [ ] Zero errors mentioning `router.tsx`
- [ ] `bun run typecheck` script exists and runs
- [ ] Build + lint exit 0; only three files changed

## STOP conditions

- `createRootRouteWithContext<RouterContext>()` produces NEW errors about context mismatches in child routes beyond the disappearing ones — report counts before/after.
- Removing `disabled` surfaces a real runtime import of WebSocket during build.

## Maintenance notes

Once 018 lands, `bun run typecheck` becomes a hard gate; consider wiring it into pre-commit later. Reviewer should confirm `settings.tsx` still compiles using `context.convexClient`.
