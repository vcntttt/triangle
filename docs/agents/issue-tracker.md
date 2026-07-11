# Issue Tracker

## Provider

Use the connected `triangle` MCP server. It controls the same personal Triangle instance shown by this repository's UI.

Before a mutation, call `triangle_workspace` or the relevant list/get tool to obtain current internal IDs and valid option values. Human-readable identifiers are for reading; mutations use record IDs returned by the tools.

## Capabilities

- Issues: filter by label, status, age, and activity; read, create, update, assign, claim,
  close with a durable resolution, archive, and organize as subissues.
- Collaboration: add comments or typed triage notes, detect activity after a triage note,
  and link research, prototype, document, or other artifacts.
- Blocking relations: inspect `blockedBy` and `blocks`, add blockers, and remove blockers. Relations cannot form cycles. A blocked issue cannot enter `in-progress`, `technical-review`, or `completed` until every blocker is `completed`.
- Subissues: create with `parentIssueId` or update the parent. Hierarchy and blocking order are independent.
- Projects: list, read, create, update, and publish health updates.
- Areas: list, create, update, delete, and assign to issues. An area belongs to one project.
- Labels: list, create, update, delete, and assign to issues.
- Issue statuses: list, create, update, and delete when unused. `completed` is required by blocking semantics.
- Workspace context: projects, areas, labels, issue/project statuses, priorities, and recent updates.

Triangle is intentionally a personal tracker. It has no teams, initiatives, members, or external pull-request triage.

## Planning workflow

Use Triangle as the record of planned work and `docs/` as the record of long-lived context and decisions. Publish specs as detailed issues, associate the relevant project and area, and create durable taxonomy through `triangle_create_label`. Represent execution order with blocking relations instead of prose-only dependency notes.

Use status IDs from `triangle_workspace`. A typical lifecycle is `backlog` → `to-do` → `in-progress` → `technical-review` → `completed`; use `paused` when work cannot advance. Archive only work that should leave normal views.
