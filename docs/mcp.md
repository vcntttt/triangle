# Triangle MCP

Triangle includes a remote MCP server at `https://triangle.tailf8b14c.ts.net/mcp`. It uses the public Convex functions and therefore shares the UI's data and backend invariants.

## Available tools

- `triangle_workspace`: statuses, priorities, projects, areas, labels, and recent updates.
- `triangle_get_execution_path`: given one or more ephemeral objective identifiers, returns their
  complete prerequisite path, work that is ready now, direct blockers, essential issue context,
  and recommended parallel stages. It is read-only and never changes the objectives selected in
  the UI or any other database record.
- Issues and subissues: filter by project, label, status, age, or activity; fetch, create,
  update, assign, claim, change status, close with a durable resolution, and archive.
- Issue collaboration: add comments and typed triage notes, detect activity after a triage
  note, and link research or prototype artifacts.
- Blocking relations: add and remove strict blockers.
- Labels and issue statuses: create, update, and delete.
- Projects and areas: list, fetch, create, update, delete areas, and publish updates.

The server intentionally omits teams and initiatives. Triangle is single-user, but it exposes the current personal assignee (`me`) for claiming and assigning work.

## Agent workflow

When an agent is asked to examine or work on an issue or group of issues, it should start with
`triangle_get_execution_path` and pass those issue identifiers as `objectiveIdentifiers`. These
objectives belong only to that invocation. The result is the prepared execution context: begin
with `readyNow`, use `recommendedStages` for safe parallelism, and read `pendingBlockers` and
`reason` before advancing a blocked issue.

```json
{
   "objectiveIdentifiers": ["CIRC-42", "APP-3"],
   "includeCompleted": false
}
```

Use `triangle_get_issue` afterward only when the execution-path response indicates that the
issue's comments, artifacts, resolution, or other detailed history is needed.

## Run locally

```bash
pnpm mcp
```

The script loads `.env.local`; `CONVEX_SELF_HOSTED_URL` or `VITE_CONVEX_URL` must point to the Convex deployment. The same server is mounted at `/mcp` using Streamable HTTP.

## Client configuration

Configure clients to use `https://triangle.tailf8b14c.ts.net/mcp` and the server name `triangle`. Restart clients after changing MCP configuration so they discover the new tool names.
