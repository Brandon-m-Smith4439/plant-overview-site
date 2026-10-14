# BFS Monroe Glass Plant Layout

Company 3D visualization and editor for the Monroe glass manufacturing plant.

## Features

- Interactive production-floor overview and first-person walkthrough
- Construction stages and today's production configuration
- Machine geometry, structural envelopes and animation timelines
- Editable machine placement, labels, production flow routes, pointers and route pivot points
- Protected Machine Design Studio and authenticated persistent workspace

## Setup

Requires Node.js 22.13+.

```sh
npm install
npm run dev
npm run validate:bfs
npm run build
npm run start
```

## Hosting and storage

Railway deploys the `bfs-layout` branch to the BFS Plant Layout project. The company instance has its own `/data` volume.

- `PLANT_WORKSPACE_PATH=/data/plant-workspace.json`
- `PLANT_WORKSPACE_FILE=/data/shared-workspace.json`

The plant layout record stores equipment locations, process pointer annotations, route connections and stage settings. The machine design record stores the editable equipment library. Both survive deployments and are protected by the company's workspace authentication.

Refer to [BFS handover](docs/BFS_HANDOFF.md) for the data backup, operations and access checklist.
