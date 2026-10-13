# BFS Plant Layout — deployment and handover

## Independent editions

| Edition | Git branch | Hosting | Features |
| --- | --- | --- | --- |
| Personal | `main` | Existing Railway `Monroe Glass Plant Evolution` | Full plant model, layout editing, first person, Combat and Zombies |
| BFS | `bfs-layout` | Separate Railway `BFS Plant Layout` | Plant model, construction stages, process routes, machine studio and editing; no game modes |

BFS does not ship `plant-combat.js`, `combat-multiplayer.js`, or the `/api/combat-lobby` endpoint. The BFS owner dashboard has no game card. Its plant viewer provides the same editing capabilities and first-person walkthrough.

## Storage and editing

- Give **each** deployment a separate persistent Railway volume mounted at `/data`. Do not attach the personal volume to BFS.
- BFS environment variables: `PLANT_WORKSPACE_PATH=/data/plant-workspace.json` and `PLANT_WORKSPACE_FILE=/data/shared-workspace.json`. Add distinct high-entropy `PLANT_OWNER_SESSION_SECRET` and `PLANT_EDITOR_SESSION_SECRET`, never commit them.
- The BFS site begins with the versioned approved snapshot `public/published-workspace.js`. **Newer layout edits only in the personal Railway volume are not automatically copied**. Compare both sites before handing over; export/publish the approved newer layout if necessary.
- Editors open `/plant-owner-7f3a9c` and authenticate. Public visitors see the layout read-only. Verify company edits persist after reload and do not change the personal site.
- The existing editor password is shared by the codebase. Rotate it during a formal BFS ownership transfer and provision company-managed credentials.

## Shipping layout changes later

1. Develop gameplay on `main`, company layout changes on `bfs-layout`.
2. Cherry-pick or selectively port common layout-only commits from `main` into `bfs-layout`. Do **not** blindly merge the entire game branch into the company branch.
3. Run `npm run validate:bfs` and `npm run build` on `bfs-layout`. Each push redeploys the matching Railway site without touching the other.
4. Back up `/data` before significant editing or workspace migration. Check permissions, owner access, health and persistence on both domains.

## Ownership
The new BFS project starts in the currently connected Railway workspace. Formal handover needs BFS-approved Railway/GitHub ownership, company billing and access policy, secret/password rotation, domain ownership and layout sign-off. The existing personal Railway project has unrelated staged volume changes; do not deploy those as part of this work.


## One-time transfer of saved layout, pointer and machine data

The deployed BFS service executes \`scripts/seed-bfs-workspace.mjs\` **before** starting the app. Set:
- \`PLANT_WORKSPACE_SEED_URL=https://monroe-glass-plant-evolution-production.up.railway.app/api/shared-workspace\`
- \`PLANT_WORKSPACE_PATH=/data/plant-workspace.json\`
- \`PLANT_WORKSPACE_FILE=/data/shared-workspace.json\`

The import reads both published storage keys from the personal site's *read-only* API. The layout key includes \`processPointers\`, \`processConnections\`, machine geometry, route tags and stage settings; the second key holds reusable machine designs. The import validates both records, makes a backup of any pre-existing BFS workspace, writes each of the BFS storage formats atomically and records a checksum and pointer counts in \`/data/bfs-workspace-import.json\`. On later redeploys the marker prevents overwriting BFS edits. No future syncing is performed.

Check the **BFS service deploy logs** for \`[BFS import] Completed\`, including nonzero saved-pointer counts when those were present in the source. If startup reports a missing/unpublished source workspace, sign in to the personal plant owner view and export/publish the latest layout, then redeploy BFS. Browser-only unsynced localStorage changes cannot be recovered from the server. Do not delete the volume or manually remove the import marker after BFS users start editing.
