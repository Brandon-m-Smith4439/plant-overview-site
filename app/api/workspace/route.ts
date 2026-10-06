import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { requestHasEditorSession } from "../_lib/editor-session";

export const dynamic = "force-dynamic";

const WORKSPACE_KIND = "monroe-glass-plant-workspace";
const WORKSPACE_VERSION = 1;
const STORAGE_PREFIX = "monroe-glass-";
const MAX_WORKSPACE_BYTES = 12 * 1024 * 1024;

interface WorkspacePayload {
  kind: string;
  version: number;
  appVersion?: string;
  exportedAt?: string;
  sourceOrigin?: string;
  items: Record<string, string>;
}

interface SharedWorkspaceRecord {
  revision: number;
  updatedAt: string;
  payload: WorkspacePayload;
}

function workspaceFile() {
  return process.env.PLANT_WORKSPACE_FILE || path.join(process.cwd(), ".data", "shared-workspace.json");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function normalizedPayload(value: unknown): WorkspacePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Partial<WorkspacePayload>;
  if (source.kind !== WORKSPACE_KIND || source.version !== WORKSPACE_VERSION || !source.items || typeof source.items !== "object" || Array.isArray(source.items)) return null;
  const items: Record<string, string> = {};
  for (const [key, storedValue] of Object.entries(source.items)) {
    if (!key.startsWith(STORAGE_PREFIX) || typeof storedValue !== "string") continue;
    items[key] = storedValue;
  }
  if (!Object.keys(items).length) return null;
  return {
    kind: WORKSPACE_KIND,
    version: WORKSPACE_VERSION,
    appVersion: String(source.appVersion || "unknown"),
    exportedAt: String(source.exportedAt || new Date().toISOString()),
    sourceOrigin: String(source.sourceOrigin || "unknown"),
    items,
  };
}

async function readRecord(): Promise<SharedWorkspaceRecord | null> {
  try {
    const raw = await readFile(workspaceFile(), "utf8");
    const value = JSON.parse(raw) as Partial<SharedWorkspaceRecord>;
    const payload = normalizedPayload(value.payload);
    if (!payload) return null;
    return {
      revision: Math.max(0, Number(value.revision) || 0),
      updatedAt: String(value.updatedAt || payload.exportedAt || ""),
      payload,
    };
  } catch (error: unknown) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "") : "";
    if (code === "ENOENT") return null;
    console.error("Shared workspace could not be read.", error);
    return null;
  }
}

export async function GET() {
  const record = await readRecord();
  if (!record) return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  return json(record);
}

export async function PUT(request: Request) {
  if (!requestHasEditorSession(request)) return json({ error: "Editor authentication required." }, 401);
  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_WORKSPACE_BYTES) return json({ error: "Workspace payload is empty or too large." }, 413);

  let source: { payload?: unknown; revision?: unknown } = {};
  try { source = JSON.parse(raw); } catch { return json({ error: "Workspace payload is not valid JSON." }, 400); }
  const payload = normalizedPayload(source.payload);
  if (!payload) return json({ error: "Workspace payload is not valid." }, 400);

  const incomingRevision = Math.max(1, Number(source.revision) || Date.now());
  const current = await readRecord();
  if (current && current.revision > incomingRevision) {
    return json({ error: "A newer shared workspace already exists.", current }, 409);
  }

  const record: SharedWorkspaceRecord = {
    revision: incomingRevision,
    updatedAt: new Date().toISOString(),
    payload,
  };
  const file = workspaceFile();
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, JSON.stringify(record), "utf8");
  await rename(temporary, file);
  return json(record);
}
