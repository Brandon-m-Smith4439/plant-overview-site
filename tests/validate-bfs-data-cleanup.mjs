import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { cleanDesigns, cleanWorkspace, scrubSavedWorkspaces } from "../scripts/sanitize-bfs-data.mjs";
const layout = JSON.stringify({ machines: [{ instanceId: "cutting", name: "Cutting table" }], processPointers: { cutting: { text: "Cutting" } }, processConnections: { route1: { pivots: [[1,2,3]] } } });
const designs = JSON.stringify({ version: 1, designs: {
  "cutter": { id: "cutter", machineType: "cutting", name: "Cutting table" },
  "combat-weapon-rifle": { id: "combat-weapon-rifle", machineType: "combatWeapon" },
  "legacy": { id: "legacy", machineType: "combatZombie" },
}});
const target = { payload: { kind: "monroe-glass-plant-workspace", version: 1, items: { "monroe-glass-plant-layout-v6": layout, "monroe-glass-machine-designs-v1": designs } } };
const filtered = cleanWorkspace(target);
assert.equal(filtered.removed, 2);
assert.equal(filtered.record.payload.items["monroe-glass-plant-layout-v6"], layout);
assert.deepEqual(Object.keys(JSON.parse(filtered.record.payload.items["monroe-glass-machine-designs-v1"]).designs), ["cutter"]);
const temp=await fs.mkdtemp(path.join(os.tmpdir(),"bfs-clean-"));
try {
 const a=path.join(temp,"published.json"),b=path.join(temp,"shared.json");
 await fs.writeFile(a, JSON.stringify(target));await fs.writeFile(b, JSON.stringify(target));
 const results=await scrubSavedWorkspaces({files:[a,b],backupRoot:temp});
 assert.equal(results.reduce((sum,x)=>sum+x.removed,0),4);
 assert.equal((await scrubSavedWorkspaces({files:[a,b],backupRoot:temp})).every(x=>x.removed===0),true);
 assert.equal(JSON.parse(await fs.readFile(a,"utf8")).payload.items["monroe-glass-plant-layout-v6"],layout);
} finally { await fs.rm(temp,{recursive:true,force:true}); }
console.log("BFS saved-data filter and process-pointer preservation passed.");
