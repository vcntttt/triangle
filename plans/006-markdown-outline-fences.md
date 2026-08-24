# Plan 006: Excluir code fences del extractor de headings de markdown

> **Executor instructions**: Follow this plan step by step. STOP conditions below.
>
> **Drift check (run first)**: `git diff --stat 0bd654e..HEAD -- lib/markdown-outline.ts components/common/issues/markdown-content.tsx`
> Mismatch → STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bd654e`, 2026-08-22

## Why this matters

`extractMarkdownHeadings` scans line-by-line and counts every `#…` line, including lines inside fenced code blocks. The renderer (`markdown-content.tsx`) does skip fence interiors. Consequence: a `# comment` inside a ` ` ``` fence inflates the outline with entries whose anchor ids don't exist in the rendered DOM (all subsequent heading ids shift because the id generator counts occurrences in order). The project DocumentOutline links to dead anchors.

## Current state

- `lib/markdown-outline.ts` — `extractMarkdownHeadings` + shared `getHeadingId`; feeds `components/common/projects/document-outline.tsx`.
- `components/common/issues/markdown-content.tsx` — renderer; it DOES track fences correctly.

Renderer's fence tracking (`markdown-content.tsx:~221,236-247`) — pattern to replicate:

```ts
const isClosingFence = (line: string, fence: string | null) => ...
// effectively: /^ {0,3}(`{3,}|~{3,})/ opens a fence; a later identical-marker line closes it
```

Extractor today (`lib/markdown-outline.ts:27-43`) processes every line with a `/^#{1,6}\s/`-style check and no fence state.

Both files share `getHeadingId` (same file, used by the renderer), so once extraction skips fences, ids align 1:1 with the DOM.

## Commands you will need

| Purpose | Command         | Expected |
| ------- | --------------- | -------- |
| Build   | `bun run build` | exit 0   |
| Lint    | `bun run lint`  | exit 0   |

## Scope

**In scope**:

- `lib/markdown-outline.ts` (extraction logic only)

**Out of scope**:

- `components/common/issues/markdown-content.tsx` — its fence handling is already correct; do not refactor it.
- Blockquote-nested headings (second-order issue noted in audit): out of scope here to keep the diff minimal; note it in Maintenance.

## Git workflow

- One commit: `fix(markdown): ignore headings inside code fences when building outline`

## Steps

### Step 1: Track fence state in `extractMarkdownHeadings`

Add a mutable `fenceMarker: string | null = null` before the loop. For each line:

1. If inside a fence: if the line matches the same closing marker (`^ {0,3}` + same marker chars), clear `fenceMarker`; skip all other processing (continue).
2. If outside: if the line matches `/^ {0,3}(`{3,}|~{3,})/`, set `fenceMarker` to the matched marker characters and continue (the fence line itself is never a heading).
3. Otherwise run the existing heading check unchanged.

Mirror the renderer's regex exactly so edge cases (indentation, tildes) behave identically — read `markdown-content.tsx:216-255` first and copy its predicate rather than inventing one.

**Verify**: `bun run build && bun run lint` → exit 0.

### Step 2: Sanity-check the pure function

Run a quick node check from repo root:

````bash
bun -e "import {extractMarkdownHeadings} from './lib/markdown-outline'; console.log(JSON.stringify(extractMarkdownHeadings('```ts\n# not a heading\n```\n# Real\n', 'p')))"
````

(Adjust import/named export to what the module actually exports; if it isn't importable standalone, verify by reading instead.)

**Verify**: output contains only the "Real" heading.

## Test plan

No test suite; the Step 2 bun -e snippet is the executable check. Cases: fenced pseudo-heading ignored; unclosed fence swallows rest of doc (acceptable, matches renderer); tilde fences handled like backticks.

## Done criteria

- [ ] Fenced lines never produce headings
- [ ] `getHeadingId` untouched; ids remain deterministic
- [ ] `bun run build && bun run lint` exit 0; only `lib/markdown-outline.ts` changed
- [ ] `plans/README.md` status row updated

## STOP conditions

- The renderer's fence predicate differs materially from `/^ {0,3}(`{3,}|~{3,})/`such that copying it requires refactoring`markdown-content.tsx`.

## Maintenance notes

Deferred known issue: headings inside blockquotes get counted by the outline but render via a nested `MarkdownContent` with its own occurrence map, producing duplicate ids. Fix together with this function if reported again. Any future markdown dialect change (renderer) must be mirrored here — consider extracting one shared tokenizer if it drifts twice more.
