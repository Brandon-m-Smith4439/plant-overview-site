/**
 * One-time BFS handover of the personal site's *server-published* workspace.
 * Only the first successful import is applied; the marker lives on the BFS-only volume.
 * Subsequent restarts and deploys never overwrite BFS edits.
 */
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_KEYS = ["monroe-glass-plant-layout-v6", "monroe-glass-machine-designs-v1"];
const MARKER_FILE = "bfs-workspace-import.json";
const MAX_FETCH_BYTES = 18 * 1024 * 1024;
const MAX_ITEM_BYTES = 8 * 1024 * 1024;

export function validatedPayload(raw) {
  const payload = raw?.workspace?.payload || raw?.payload;
  if (!payload || payload.kind !== "monroe-glass-plant-workspace" || payload.version !== 1
      || !payload.items || typeof payload.items !== "object") {
    throw new Error("Source did not return a valid published workspace.");
  }
  const items = {};
  for (const key of REQUIRED_KEYS) {
    const item = payload.items[key];
    if (typeof item !== "string" || !item || Buffer.byteLength(item, "utf8") > MAX_ITEM_BYTES) {
      throw new Error("Source workspace is missing required data: " + key);
    }
    JSON.parse(item);
    items[key] = item;
  }
  return { ...payload, items };
}

export function pointerSummary(payload) {
  const layout = JSON.parse(payload.items["monroe-glass-plant-layout-v6"]);
  const count = (value) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).length : 0;
  return {
    machines: Array.isArray(layout.machines) ? layout.machines.length : 0,
    processPointers: count(layout.processPointers),
    processConnections: count(layout.processConnections),
    pointerInitialized: layout.processPointersInitialized === true,
    connectionsInitialized: layout.processConnectionsInitialized === true,
  };
}

async function sourceWorkspace(url) {
  const uri = new URL(url);
  if (uri.protocol !== "https:" || uri.pathname !== "/api/shared-workspace") {
    throw new Error("PLANT_WORKSPACE_SEED_URL must use the trusted HTTPS shared-workspace endpoint.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(uri, { method: "GET", signal: controller.signal, redirect: "error", headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Source workspace returned HTTP " + response.status);
    if (Number(response.headers.get("content-length") || 0) > MAX_FETCH_BYTES) throw new Error("Source workspace response too large.");
    const data = await response.text();
    if (Buffer.byteLength(data, "utf8") > MAX_FETCH_BYTES) throw new Error("Source workspace response too large.");
    return validatedPayload(JSON.parse(data));
  } finally {
    clearTimeout(timeout);
  }
}

async function atomicWrite(target, record) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = target + "." + randomUUID() + ".tmp";
  try {
    await fs.writeFile(temp, JSON.stringify(record) + "\n", { encoding: "utf8", flag: "wx" });
    await fs.rename(temp, target);
  } finally { await fs.rm(temp, { force: true }).catch(() => {}); }
}

async function backupIfExists(target, backupDir) {
  try {
    const existing = await fs.readFile(target);
    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(path.join(backupDir, path.basename(target)), existing, { flag: "wx" });
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function seedBfsWorkspace({
  seedUrl = process.env.PLANT_WORKSPACE_SEED_URL,
  workspacePath = process.env.PLANT_WORKSPACE_PATH || "/data/plant-workspace.json",
  alternativePath = process.env.PLANT_WORKSPACE_FILE || "/data/shared-workspace.json",
  fetchSource = sourceWorkspace,
} = {}) {
  if (!seedUrl) return { status: "not-configured" };
  const markerPath = path.join(path.dirname(workspacePath), MARKER_FILE);
  try {
    const marker = JSON.parse(await fs.readFile(markerPath, "utf8"));
    if (marker?.status === "complete") {
      console.log("[BFS import] Previously completed; preserved independent BFS workspace.", marker.summary);
      return { status: "already-imported", summary: marker.summary };
    }
  } catch (error) { if (error?.code !== "ENOENT") throw error; }
  if (path.resolve(workspacePath) === path.resolve(alternativePath)) throw new Error("Workspace files must be distinct.");
  const payload = await fetchSource(seedUrl);
  const summary = pointerSummary(payload);
  const layout = JSON.parse(payload.items["monroe-glass-plant-layout-v6"]);
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) throw new Error("Invalid source layout.");
  const stamp = new Date().toISOString();
  const digest = createHash("sha256").update(payload.items["monroe-glass-plant-layout-v6"]).digest("hex");
  // Preserve existing company changes for recovery if BFS has already been opened and edited.
  const backupDir = path.join(path.dirname(workspacePath), "backup-before-bfs-import-" + stamp.replace(/[:.]/g, "-"));
  const backedUp = [
    await backupIfExists(workspacePath, backupDir),
    await backupIfExists(alternativePath, backupDir),
  ].some(Boolean);
  await atomicWrite(workspacePath, { schemaVersion: 1, updatedAt: stamp, payload });
  await atomicWrite(alternativePath, { revision: Date.now(), updatedAt: stamp, payload });
  const marker = {
    status: "complete", importedAt: stamp, source: new URL(seedUrl).origin,
    appVersion: payload.appVersion, sha256: digest, summary, backupCreated: backedUp,
  };
  await atomicWrite(markerPath, marker);
  console.log("[BFS import] Completed one-time layout, machine library and pointer transfer.", marker);
  return { status: "imported", summary, backedUp };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedBfsWorkspace().catch(error => {
    console.error("[BFS import] Transfer failed; refusing to start without the saved layout:", error.message);
    process.exitCode = 1;
  });
}
