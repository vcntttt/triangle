# React Doctor Exceptions

This project keeps a small React Doctor override file for architectural warnings
that are intentionally out of scope for dead-code cleanup.

## Why these exceptions exist

The ignored rules do not represent immediate correctness or accessibility bugs in
the current app. They point to larger refactors that should be handled as focused
feature work, with UI regression review, rather than mixed into maintenance
cleanup.

## Exceptions

### Generated and framework-owned surfaces

Files:

- `.output/**`
- `convex/_generated/server.js`
- `convex/_generated/api.js`
- `convex/issueStatuses.ts`
- `convex/issues.ts`
- `convex/labels.ts`
- `convex/projects.ts`
- `convex/viewer.ts`
- `lib/db/labels.ts`
- `components/ui/alert.tsx`
- `components/ui/breadcrumb.tsx`
- `components/ui/card.tsx`
- `components/ui/checkbox.tsx`
- `components/ui/collapsible.tsx`
- `components/ui/form.tsx`
- `components/ui/progress.tsx`
- `components/ui/table.tsx`
- `components/ui/toggle.tsx`

Rules:

- `deslop/unused-file`
- `deslop/unused-export`
- `react-doctor/mcp-tool-capability-risk`
- `react-doctor/request-body-mass-assignment`

Reason:

The build output and Convex generated modules are not source entrypoints that
React Doctor can resolve statically. Convex discovers backend functions through
the generated `api` surface, while the UI component files are an intentionally
kept local shadcn component library and compatibility type surface. MCP's
capabilities are intentional and live in generated server output; the source
route is reviewed separately as an application boundary.

Accepted risk:

These are excluded from dead-code and generated-output heuristics only. Runtime
security and behavior diagnostics in application source remain enabled.

### Sequential subissue allocation

File:

- `convex/issues.ts`

Rule:

- `react-doctor/async-await-in-loop`

Reason:

Creating subissues currently allocates the next human-readable identifier and
rank by reading the records created so far. Keeping that loop sequential avoids
duplicate identifiers or ranks. Making it parallel requires a transactional
allocator rather than replacing the loop with `Promise.all`.

Accepted risk:

Creating many subissues pays one allocation read per child. This is a known
backend optimization boundary, not an independent-await bug.

### Project overview composition

File:

- `components/common/projects/project-detail-overview.tsx`

Rule:

- `react-doctor/no-giant-component`

Reason:

The component owns the project draft, optimistic field updates, icon updates,
issue navigation, project areas, and update timeline in one route surface.
Splitting it safely needs behavior-level review across those workflows.

Accepted risk:

The component remains harder to maintain, but this is a scoped structural task;
the runtime and correctness findings in the component are still checked.

### `react-doctor/no-giant-component`

Files:

- `components/common/issues/issue-detail.tsx`
- `components/common/issues/issue-context-menu.tsx`
- `components/layout/headers/issues/filter.tsx`
- `components/layout/sidebar/create-new-issue/index.tsx`
- `src/routes/projects.$projectSlug.tsx`

Reason:

These are large surfaces with coupled UI and state behavior. Splitting them is
valid future work, but doing so safely requires behavior-level review and likely
screenshots across issue/project workflows.

Future resolution:

Extract stable subcomponents around existing boundaries: header/actions,
metadata selectors, destructive actions, issue composer sections, and route tab
panels.

Accepted risk:

Maintenance cost remains higher in these files, but runtime behavior is unchanged.

### `react-doctor/prefer-useReducer`

Files:

- `components/common/issues/issue-detail.tsx`
- `components/common/projects/create-project-dialog.tsx`
- `components/common/projects/create-project-update-dialog.tsx`
- `components/common/settings/project-options-settings.tsx`
- `components/layout/sidebar/create-new-issue/index.tsx`

Reason:

These components use multiple related `useState` calls for form/dialog state.
Converting them to reducers is a structural refactor, not a dead-code cleanup.

Future resolution:

Introduce reducers per form/dialog with typed actions and reset semantics, then
verify creation, cancel, edit, and failed-submit flows.

Accepted risk:

State transitions are more distributed than ideal, but current flows build and
lint cleanly.

### `react-doctor/no-cascading-set-state`

Files:

- `components/common/projects/create-project-update-dialog.tsx`
- `components/layout/sidebar/create-new-issue/index.tsx`

Reason:

The flagged effects reset dialog/composer UI state on open/close or prop changes.
Those resets are deliberate. A reducer can consolidate them later.

Future resolution:

Fold reset behavior into the same reducers described above.

Accepted risk:

Extra renders can occur on dialog state changes, but this is not currently a hot
path.

### `react-doctor/prefer-use-effect-event`

Files:

- `components/layout/sidebar/create-new-issue/index.tsx`

Reason:

React Doctor recommends `useEffectEvent` for the submit shortcut listener, but
this app currently installs React `19.0.1`, whose CommonJS package does not
provide `useEffectEvent` as a named export. Importing it causes Vite dev SSR to
fail before the page renders.

Future resolution:

Remove this exception after upgrading React to a version that exposes
`useEffectEvent` in the installed runtime package, then switch the shortcut
listener back to an effect event.

Accepted risk:

The keydown listener re-subscribes when the memoized `createIssue` callback
changes. This is preferable to a dev/runtime crash and is limited to the open
composer dialog.

### `react-doctor/no-derived-state-effect`

Files:

- `components/layout/sidebar/create-new-issue/index.tsx`

Reason:

The remaining derived-state warning is tied to composer reset semantics. It
should be fixed together with the composer reducer to avoid changing behavior in
isolation.

Future resolution:

Move composer state initialization and reset into a reducer action keyed by the
modal defaults.

Accepted risk:

The composer reset logic remains explicit and covered by build/lint checks.

### `react-doctor/no-derived-state`

Files:

- `components/common/issues/issue-detail.tsx`

Reason:

The flagged title and description state are editable drafts. The component must
let the user type locally, debounce persistence, and reset when the selected
issue changes. Deriving those values directly during render would remove the
draft buffer and change editor behavior.

Future resolution:

Extract the title/description editor into a focused component with explicit
draft lifecycle and debounced persistence tests.

Accepted risk:

The effect performs a controlled draft reset on issue changes. This costs an
extra render, but preserves the current editing behavior.

### `react-doctor/no-event-handler` and `react-doctor/no-chain-state-updates`

Files:

- `components/layout/sidebar/create-new-issue/index.tsx`

Reason:

The flagged effects reset composer UI derived from dialog open state, token
suggestion state, and parent/subissue mode. These are local dialog ergonomics
and were already tracked as reducer follow-up work.

Future resolution:

Move composer state into a reducer so reset transitions happen through explicit
actions instead of effects.

Accepted risk:

Dialog open/close and token suggestion changes can cause an extra render, but
the behavior is localized to the composer.

### `react-doctor/no-multi-comp`

Files:

- `src/routes/__root.tsx`

Reason:

TanStack root route files commonly keep the route declaration, root document,
not-found component, and error component together because the route config
references them directly. Splitting this file is a low-value structural refactor
for this migration.

Future resolution:

Extract root error/not-found views only if the root route grows additional
behavior or shared error presentation is introduced.

Accepted risk:

Maintainability is acceptable for this small route shell, and runtime behavior
is unchanged.

### `react-doctor/rerender-state-only-in-handlers`

Files:

- `src/routes/projects.$projectSlug.tsx`

Reason:

The inline editable field uses state to switch render branches between display
and input modes. React Doctor reports this pattern conservatively.

Future resolution:

Extract `EditableTextField` into its own component and review whether the edit
mode can be isolated more cleanly.

Accepted risk:

The state is local to a small editing widget and does not affect broader page
state.
