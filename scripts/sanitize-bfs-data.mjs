import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DESIGN_KEY = "monroe-glass-machine-designs-v1";
export function cleanDesigns(raw) {
  const record = JSON.parse(raw);
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("Invalid machine library.");
  const designs = record.designs && typeof record.designs === "object" && !Array.isArray(record.designs) ? record.designs : null;
  if (!designs) return { data: raw, removed: 0 };
  let removed = 0;
  const clean = {};
  for (const [id, design] of Object.entries(designs)) {
    const unsuitable = /^combat-(weapon|zombie)-/i.test(id) || /^(combatWeapon|combatZombie)$/i.test(String(design?.machineType || ""));
    if (unsuitable) { removed++; continue; }
    clean[id] = design;
  }
  if (!removed) return { data: raw, removed: 0 };
  return { data: JSON.stringify({ ...record, designs: clean }), removed };
}
export function cleanWorkspace(record) {
  if (!record?.payload?.items || typeof record.payload.items !== "object") return { record, removed: 0 };
  const original = record.payload.items[DESIGN_KEY];
  if (typeof original !== "string") return { record, removed: 0 };
  const result = cleanDesigns(original);
  if (!result.removed) return { record, removed: 0 };
  return { record: { ...record, payload: { ...record.payload, items: { ...record.payload.items, [DESIGN_KEY]: result.data } } }, removed: result.removed };
}
async function storeAtomically(file, contents) {
  await mkdir(dirname(file), { recursive: true });
  const temp = file + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temp, contents, { encoding: "utf8", flag: "wx" });
    await rename(temp, file);
  } finally { await rm(temp, { force: true }).catch(() => {}); }
}
export async function scrubSavedWorkspaces({ files = [
  process.env.PLANT_WORKSPACE_PATH || "/data/plant-workspace.json",
  process.env.PLANT_WORKSPACE_FILE || "/data/shared-workspace.json",
], backupRoot = dirname(files[0]) } = {}) {
  const results = [];
  for (const file of new Set(files)) {
    let before;
    try { before = await readFile(file, "utf8"); }
    catch (error) { if (error?.code === "ENOENT") continue; throw error; }
    const parsed = JSON.parse(before);
    const { record, removed } = cleanWorkspace(parsed);
    if (!removed) { results.push({ file, removed: 0 }); continue; }
    const backup = join(backupRoot, "backup-company-library-" + randomUUID() + ".json");
    await storeAtomically(backup, before);
    await storeAtomically(file, JSON.stringify(record) + "\n");
    results.push({ file, removed, backedUp: true });
  }
  return results;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  scrubSavedWorkspaces().then(results => console.log("[BFS workspace] Company-only design records verified.", results))
    .catch(error => { console.error("[BFS workspace] Data cleanup failed:", error); process.exitCode = 1; });
}
