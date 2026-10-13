import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { seedBfsWorkspace, validatedPayload, pointerSummary } from "../scripts/seed-bfs-workspace.mjs";

const workspace = {
  kind: "monroe-glass-plant-workspace", version: 1, appVersion: "test",
  sourceUpdatedAt: new Date(1000000).toISOString(),
  items: {
    "monroe-glass-plant-layout-v6": JSON.stringify({ machines: [{ id: "cutting" }], processPointers: { cutting: { text: "Cutting" } }, processConnections: { "cutting-polisher": { color: "#00ffdd", pivotPoints: [[1,2,3]] } }, processPointersInitialized: true, processConnectionsInitialized: true }),
    "monroe-glass-machine-designs-v1": JSON.stringify({ machines: [] }),
  },
};
assert.deepEqual(pointerSummary(validatedPayload({ workspace: { payload: workspace } })), {
  machines: 1, processPointers: 1, processConnections: 1,
  pointerInitialized: true, connectionsInitialized: true,
});
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "bfs-import-test-"));
try {
  const live = path.join(temp,"plant-workspace.json"), alternate = path.join(temp,"shared-workspace.json");
  await fs.writeFile(live, JSON.stringify({ payload: { items: { legacy: "old data" } } }));
  let calls = 0;
  const options = { seedUrl: "https://example.test/api/shared-workspace", workspacePath: live, alternativePath: alternate, fetchSource: async () => { calls++; return validatedPayload({ workspace: { payload: workspace } }); } };
  const initial = await seedBfsWorkspace(options);
  assert.equal(initial.status, "imported");
  assert.equal(initial.backedUp, true);
  assert.equal(JSON.parse(await fs.readFile(live, "utf8")).payload.items["monroe-glass-plant-layout-v6"], workspace.items["monroe-glass-plant-layout-v6"]);
  assert.deepEqual(JSON.parse(await fs.readFile(alternate,"utf8")).payload.items, workspace.items);
  const marker = JSON.parse(await fs.readFile(path.join(temp,"bfs-workspace-import.json"),"utf8"));
  assert.equal(marker.summary.processPointers, 1);
  assert.equal(marker.summary.processConnections, 1);
  await fs.writeFile(live, JSON.stringify({ changedByBfs: true }));
  assert.equal((await seedBfsWorkspace(options)).status, "already-imported");
  assert.equal(calls, 1);
  assert.deepEqual(JSON.parse(await fs.readFile(live, "utf8")), { changedByBfs: true });
} finally { await fs.rm(temp, { force: true, recursive: true }); }
console.log("BFS import: layout, pointer connections, machine designs, backups and no-overwrite passed.");
