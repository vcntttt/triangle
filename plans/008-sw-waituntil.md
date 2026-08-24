# Plan 008: Envolver las escrituras de caché del service worker en `event.waitUntil`

> **Executor instructions**: Follow this plan step by step. STOP conditions below.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- public/sw.js`
> Mismatch → STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

In `public/sw.js` the fetch handler starts `caches.open(...).then(cache => cache.put(...))` as a fire-and-forget promise. The browser may terminate the service worker as soon as `respondWith`'s promise resolves, killing the in-flight `cache.put`. The offline app shell then intermittently misses responses that were believed cached, and the offline navigation fallback (`sw.js:46`) fails sporadically.

## Current state

- `public/sw.js` — the PWA service worker (`src/pwa.ts` registers it, PROD-only).

Navigation handler (~lines 35–47):

```js
if (request.mode === 'navigate') {
   event.respondWith(
      fetch(request)
         .then((response) => {
            if (response.ok) {
               const responseCopy = response.clone();
               caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
            }
            return response;
         })
         .catch(() =>
            caches
               .match(request)
               .then((cachedResponse) => cachedResponse || caches.match('/projects'))
         )
   );
   return;
}
```

Assets handler (~lines 49–64) has the identical fire-and-forget `cache.put` pattern inside its `fetch(request).then(...)` chain.

## Commands you will need

| Purpose      | Command                                                      | Expected                           |
| ------------ | ------------------------------------------------------------ | ---------------------------------- |
| Build        | `bun run build`                                              | exit 0 (sw.js is copied to output) |
| Lint         | `bun run lint`                                               | exit 0                             |
| Syntax check | `bun build --no-bundle public/sw.js --outfile /dev/null 2>&1 |                                    | node --check public/sw.js` | no syntax errors |

## Scope

**In scope**:

- `public/sw.js` (both fetch-handler branches)

**Out of scope**:

- Caching strategy itself (network-first for navigation, cache-first for assets stays).
- `CACHE_NAME` bump — not needed; behavior of existing entries unchanged.
- `src/pwa.ts`.

## Git workflow

- One commit: `fix(pwa): keep cache writes alive with waitUntil`

## Steps

### Step 1: Fix the navigation branch

Compose the cache write into a promise passed to `event.waitUntil`, keeping `respondWith` returning only the response:

```js
if (request.mode === 'navigate') {
   const responsePromise = fetch(request).catch(() =>
      caches.match(request).then((cachedResponse) => cachedResponse || caches.match('/projects'))
   );
   event.respondWith(responsePromise);
   event.waitUntil(
      responsePromise.then((response) => {
         if (!response.ok) return;
         return caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      })
   );
   return;
}
```

### Step 2: Fix the assets branch the same way

Keep the existing cache-first shape but hoist the put into `event.waitUntil`:

```js
event.respondWith(
   caches.match(request).then(
      (cachedResponse) =>
         cachedResponse ||
         fetch(request).then((response) => {
            if (!response.ok) return response;
            return response; // put happens via waitUntil below
         })
   )
);
```

plus an accompanying `event.waitUntil(...)` that performs `fetch(request)` result caching. If restructuring feels risky, an equally correct minimal edit is: assign the inner promise chain to a variable and add one `event.waitUntil(sameChainWithPut)` line before `respondWith` — duplication of the fetch is acceptable per spec since the browser dedupes within the same handler tick only when using the same Request object; prefer sharing one promise variable.

**Verify**: `node --check public/sw.js` → clean; `grep -n "waitUntil" public/sw.js` → waitUntil present in both branches.

### Step 3: Verify build

Run `bun run build && bun run lint`.

**Verify**: exit 0.

## Test plan

No automated SW tests. Manual (PROD build + browser DevTools → Application → Service Workers): load app online, confirm network responses get written into `triangle-shell-v1`; kill network, reload, navigation falls back to cache.

## Done criteria

- [ ] Both `cache.put` chains are reachable from an `event.waitUntil` call
- [ ] `node --check public/sw.js` passes
- [ ] `bun run build && bun run lint` exit 0
- [ ] Only `public/sw.js` modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- Live `sw.js` differs from excerpts beyond cosmetic whitespace.
- Lint rejects `waitUntil` typing (sw.js has `/* global ... */` header — extend it if needed; if eslint still fails after two attempts, report).

## Maintenance notes

If the caching strategy changes (e.g. workbox adoption), this concern disappears but must be re-checked for any hand-written handler. Reviewer should confirm the fallback path still resolves before `waitUntil` promises.
