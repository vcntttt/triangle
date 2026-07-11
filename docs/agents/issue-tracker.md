# Issue Tracker

## Provider

Use the connected `circle` MCP server. It controls the same personal Circle instance shown by this repository's UI.

Before a mutating action, call `circle_workspace` or the relevant list/get tool to obtain current IDs and valid status or priority values. Prefer human-readable project names and issue identifiers when reading; mutations require the internal record IDs returned by those tools.

## Capabilities

- Issues: list, read, create, update, change status, and archive.
- Projects: list, read, create, update, and publish health updates.
- Workspace context: labels plus issue/project status and priority options.

Circle is intentionally a personal tracker. It has no teams, initiatives, members, native blocking relations, or external pull-request triage. Do not invent those concepts in issues or expect the MCP to manage them.

## Planning workflow

Use Circle as the record of planned work and `docs/` as the record of long-lived context and decisions.

When a workflow skill publishes a spec or ticket, create it as an issue with a detailed Markdown description, associate it with the relevant project when one exists, and use only labels already present in Circle. If a desired triage label does not exist, do not fabricate it; record the readiness in the issue description instead.

Use status IDs from `circle_workspace`. A typical lifecycle is `backlog` → `to-do` → `in-progress` → `technical-review` → `completed`; use `paused` for work that cannot currently advance. Archive only work that should leave normal views.
