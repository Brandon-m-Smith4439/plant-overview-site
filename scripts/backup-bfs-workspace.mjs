import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

// Snapshot the exact production workspace before a deployment starts. Never
// normalize, seed, or alter the source files while creating this backup.
const files = [process.env.PLANT_WORKSPACE_PATH || "/data/plant-workspace.json",
               process.env.PLANT_WORKSPACE_FILE || "/data/shared-workspace.json"];
const root = process.env.BFS_WORKSPACE_BACKUP_DIRECTORY || "/data/bfs-layout-backups";
const stamp = new Date().toISOString().replace(/[:.]/g,"-");
await fs.mkdir(root, { recursive: true });
for (const source of new Set(files)) {
  let raw;
  try { raw = await fs.readFile(source); }
  catch (error) { if (error.code === "ENOENT") { console.log("[BFS backup] Source not found:",path.basename(source)); continue; } throw error; }
  const document = JSON.parse(raw.toString("utf8"));
  const summary = { updatedAt: document.updatedAt || null };
  const layoutRaw = document?.payload?.items?.["monroe-glass-plant-layout-v6"];
  if (layoutRaw) {
    const layout = JSON.parse(layoutRaw);
    summary.machines = Array.isArray(layout.machines) ? layout.machines.length : 0;
    summary.processPointers = Object.keys(layout.processPointers || {}).length;
    summary.processConnections = Object.keys(layout.processConnections || {}).length;
    summary.layoutUpdatedAt = layout.updatedAt || null;
  }
  const sha256 = createHash("sha256").update(raw).digest("hex");
  const dir = path.join(root, stamp + "-" + path.basename(source,".json"));
  const temp = dir + "." + randomUUID() + ".tmp";
  try {
    await fs.writeFile(temp, raw, { flag: "wx" });
    await fs.rename(temp,dir + ".json");
  } finally { await fs.rm(temp,{force:true}).catch(()=>{}); }
  const verify = createHash("sha256").update(await fs.readFile(dir+".json")).digest("hex");
  if (verify !== sha256) throw new Error("BFS workspace snapshot did not verify.");
  console.log("[BFS backup] Snapshot verified:",JSON.stringify({file:path.basename(source),backup:path.basename(dir+".json"),sha256,bytes:raw.length,...summary}));
}
