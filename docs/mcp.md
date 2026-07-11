# Triangle MCP

Triangle includes a remote MCP server at `https://triangle.tailf8b14c.ts.net/mcp`. It uses the public Convex functions and therefore shares the UI's data and backend invariants.

## Available tools

- `triangle_workspace`: statuses, priorities, projects, areas, labels, and recent updates.
- Issues and subissues: filter by project, label, status, age, or activity; fetch, create,
  update, assign, claim, change status, close with a durable resolution, and archive.
- Issue collaboration: add comments and typed triage notes, detect activity after a triage
  note, and link research or prototype artifacts.
- Blocking relations: add and remove strict blockers.
- Labels and issue statuses: create, update, and delete.
- Projects and areas: list, fetch, create, update, delete areas, and publish updates.

The server intentionally omits teams, initiatives, and members because Triangle does not model them.

## Run locally

```bash
pnpm mcp
```

The script loads `.env.local`; `CONVEX_SELF_HOSTED_URL` or `VITE_CONVEX_URL` must point to the Convex deployment. The same server is mounted at `/mcp` using Streamable HTTP.

## Client configuration

Configure clients to use `https://triangle.tailf8b14c.ts.net/mcp` and the server name `triangle`. Restart clients after changing MCP configuration so they discover the new tool names.
