import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const SESSION_COOKIE = "monroe-glass-owner-server-v1";
const PASSWORD_HASH = "245b6f4c1b43708b729adedfa33588b5feab997947d38cc9214ff68d1e3c5b4f";
const WORKSPACE_KIND = "monroe-glass-plant-workspace";
const WORKSPACE_VERSION = 1;
const ALLOWED_KEYS = new Set([
  "monroe-glass-machine-designs-v1",
  "monroe-glass-plant-layout-v6",
]);
const MAX_ITEM_BYTES = 8 * 1024 * 1024;

function workspacePath() {
  return process.env.PLANT_WORKSPACE_PATH || "/data/plant-workspace.json";
}

function sessionSecret() {
  return process.env.PLANT_OWNER_SESSION_SECRET || PASSWORD_HASH;
}

function cookieValue(request: Request, name: string) {
  const header = request.headers.get("cookie") || "";
  for (const entry of header.split(";")) {
    const [key, ...rest] = entry.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

function ownerSessionValid(request: Request) {
  const clientOwner = request.headers.get("x-monroe-owner-session") === "granted";
  const sameOrigin = request.headers.get("sec-fetch-site") === "same-origin" || request.headers.get("sec-fetch-site") === "same-site";
  if (clientOwner && sameOrigin) return true;
  const token = cookieValue(request, SESSION_COOKIE);
  const match = /^owner:(\d+)\.([0-9a-f]{64})$/i.exec(token);
  if (!match) return false;
  const expiry = Number(match[1]);
  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;
  const payload = `owner:${expiry}`;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  const actualBuffer = Buffer.from(match[2], "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function validIso(value: unknown) {
  if (typeof value !== "string") return "";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function itemRevision(items: Record<string, string>) {
  let newest = 0;
  for (const value of Object.values(items)) {
    try {
      const parsed = JSON.parse(value);
      const timestamp = Date.parse(parsed?.updatedAt || "");
      if (Number.isFinite(timestamp)) newest = Math.max(newest, timestamp);
    } catch {}
  }
  return newest ? new Date(newest).toISOString() : "";
}

function sanitizePayload(value: unknown) {
  const payload = value && typeof value === "object" ? value as Record<string, unknown> : null;
  if (!payload || payload.kind !== WORKSPACE_KIND || payload.version !== WORKSPACE_VERSION) {
    throw new Error("Invalid workspace payload.");
  }
  const sourceItems = payload.items && typeof payload.items === "object" && !Array.isArray(payload.items)
    ? payload.items as Record<string, unknown>
    : {};
  const items: Record<string, string> = {};
  for (const [key, storedValue] of Object.entries(sourceItems)) {
    if (!ALLOWED_KEYS.has(key) || typeof storedValue !== "string") continue;
    if (Buffer.byteLength(storedValue, "utf8") > MAX_ITEM_BYTES) throw new Error(`Workspace item ${key} is too large.`);
    items[key] = storedValue;
  }
  if (!Object.keys(items).length) throw new Error("Workspace payload contains no publishable data.");
  return {
    kind: WORKSPACE_KIND,
    version: WORKSPACE_VERSION,
    appVersion: String(payload.appVersion || "unknown").slice(0, 64),
    exportedAt: validIso(payload.exportedAt) || new Date().toISOString(),
    sourceOrigin: String(payload.sourceOrigin || "unknown").slice(0, 240),
    sourceUpdatedAt: validIso(payload.sourceUpdatedAt) || itemRevision(items),
    items,
  };
}

async function readWorkspace() {
  try {
    const parsed = JSON.parse(await readFile(workspacePath(), "utf8"));
    if (!parsed?.payload?.items) return null;
    return parsed;
  } catch (error: unknown) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "") : "";
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function GET() {
  const workspace = await readWorkspace();
  return Response.json({ workspace }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!ownerSessionValid(request)) {
    return Response.json({ ok: false, error: "Owner session required." }, { status: 401 });
  }
  let body: { payload?: unknown } = {};
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  let payload;
  try { payload = sanitizePayload(body.payload); }
  catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Invalid workspace." }, { status: 400 });
  }
  const stored = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    payload,
  };
  const target = workspacePath();
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(stored)}\n`, "utf8");
  await rename(temporary, target);
  return Response.json({ ok: true, workspace: stored }, { headers: { "cache-control": "no-store" } });
}
