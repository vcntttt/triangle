# Circle MCP

Circle includes a remote MCP server for its personal issue tracker at `https://triangle.tailf8b14c.ts.net/mcp`. It uses the existing public Convex functions, so it shares the UI's data and backend validation.

## Available tools

- `circle_workspace`: valid option IDs, projects, labels, and recent updates.
- Issues: list, fetch, create, update, change status, and archive.
- Projects: list, fetch, create, update, and publish an update.

The server intentionally does not expose teams, initiatives, blocking relations, or members because Circle does not model them yet.

## Run locally

```bash
pnpm mcp
```

The script loads `.env.local`; `CONVEX_SELF_HOSTED_URL` or `VITE_CONVEX_URL` must point to the Convex deployment. The same server is mounted at `/mcp` by the production app using Streamable HTTP.

## Client configuration

Codex and OpenCode are configured from `~/dotfiles/.config/ai/mcp.json` to use:

```text
https://triangle.tailf8b14c.ts.net/mcp
```

Run `~/dotfiles/.config/ai/sync.sh` after changing the canonical MCP definitions. Restart an existing Codex or OpenCode session after synchronization so it discovers the `circle` server. Access to the endpoint is intended to be restricted by the Tailscale network.
