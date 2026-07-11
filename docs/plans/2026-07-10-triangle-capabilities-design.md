# Triangle capabilities design

Triangle will persist issue statuses, labels, project areas, and directed issue blocking relations in Convex. A relation `blocker -> blocked` forms part of a directed acyclic graph: self-relations, duplicates, and cycles are rejected.

An issue with any blocker whose status is not `completed` cannot transition to `in-progress`, `technical-review`, or `completed`. This invariant is enforced in Convex so UI and MCP clients receive identical behavior. Subissue hierarchy remains independent from blocking order.

Issue payloads expose both `blockedBy` and `blocks`. The issue detail UI displays these relations and lets users add or remove blockers. The MCP exposes status, label, area, and relation operations, and its workspace response includes all relevant option records.

The visible product and MCP are branded Triangle. Historical dependency names, icon component names, deployment paths, and the upstream attribution in `LICENSE.md` remain unchanged where renaming would be inaccurate or destructive.

Verification uses the repository's supported path: production build, lint, and React Doctor.
