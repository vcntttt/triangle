# Issue automations design

## Scope

Triangle will support persistent, configurable issue automations. The first action type removes a label. A rule can remove several labels by containing several ordered actions, and the action model can be extended later without changing the trigger model.

The first built-in rule is enabled when both labels exist: when an issue enters `completed`, remove `ready-for-agent` and `ready-for-human`. Rules only react to future transitions; creating or enabling one does not modify existing issues.

## Data model

An `issueAutomations` table stores a name, enabled state, optional source status, required destination status, ordered actions, and timestamps. Omitting the source status means “from any status.” The initial action union contains `{ type: "removeLabel", labelId }`.

Status and label references use stable IDs. A referenced status cannot be deleted while a rule uses it. Deleting a label removes its actions from rules; rules left without actions are disabled.

## Execution

All server-side issue status changes use one helper. It validates the transition, patches the issue, finds enabled matching rules, and applies actions within the same Convex mutation. Direct changes, completion with a resolution, archive operations, parent advancement, and cascading child changes therefore share identical behavior.

A rule matches when its destination equals the new status and its optional source is absent or equals the previous status. A no-op status assignment is not a transition and does not run rules. Removing an absent label is idempotent. Convex mutation atomicity prevents a status change from committing without its automation actions.

## Interface and errors

Settings contains an Automations section with a compact list, enable switches, create/edit dialogs, and deletion. The dialog configures the rule name, optional source, destination, and one or more labels to remove.

Invalid or stale references are rejected by server validation. User-facing mutations show success or error toasts. Empty action lists, identical source and destination states, blank names, and unknown statuses or labels are not accepted.

## Verification

Verify creation, editing, toggling, and deletion in Settings. Verify matching and non-matching transitions, wildcard sources, exact sources, cascading subissues, completion through each server mutation, idempotent label removal, and disabled rules. The repository validation path is `pnpm build && pnpm lint`, followed by React Doctor.
