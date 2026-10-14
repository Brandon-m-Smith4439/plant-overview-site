# BFS Plant Layout — deployment and handover

## Current environment

- Project: BFS Plant Layout (Railway)
- Repository: `Brandon-m-Smith4439/plant-overview-site`
- Production branch: `bfs-layout`
- Domain: `https://bfs-plant-layout-production.up.railway.app`
- Persistent data mount: `/data`
- `PLANT_WORKSPACE_PATH=/data/plant-workspace.json`
- `PLANT_WORKSPACE_FILE=/data/shared-workspace.json`

## Saved workspace data

The source layout, equipment geometry, machine library and editing configuration were initially copied to the BFS volume on October 13, 2026. The imported record contains process pointer positions, route connections and any saved pivots. No automatic cross-site synchronization takes place after the one-time import.

The marker `/data/bfs-workspace-import.json` indicates that the import completed. Keep this marker in place so new deployments do not overwrite BFS changes.

## Editing and validation

1. Open the protected editor at `/plant-owner-7f3a9c`, authenticate and inspect today's layout.
2. Move a process pointer or route pivot and save. Verify the updated layout after refreshing the site and in another browser.
3. Review machine designs, floor route geometry, timeline stages, structural dimensions and first-person walkthrough.
4. Back up the persistent volume before major changes and keep separate editor/session secrets.
5. Run `npm run validate:bfs` and `npm run build` before deployment; verify Railway health and runtime logs.

The public layout is read-only. Rotate authentication credentials and give BFS managed access to the Railway project and source repository before the final operational handover.
