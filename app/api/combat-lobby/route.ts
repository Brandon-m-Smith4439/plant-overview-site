import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const SESSION_COOKIE = "monroe-glass-owner-server-v1";
const PASSWORD_HASH = "245b6f4c1b43708b729adedfa33588b5feab997947d38cc9214ff68d1e3c5b4f";
const PLAYER_STALE_MS = 30_000;
const LOBBY_EXPIRE_MS = 2 * 60 * 60 * 1000;
const MAX_PLAYERS = 6;
const MAX_EVENTS = 120;

type PlayerState = {
  x?: number; y?: number; z?: number; yaw?: number; pitch?: number;
  health?: number; shield?: number; moving?: boolean; weapon?: string;
  alive?: boolean; kills?: number; headshots?: number;
};

type LobbyPlayer = {
  id: string;
  name: string;
  characterId: string;
  ready: boolean;
  joinedAt: number;
  lastSeenAt: number;
  state: PlayerState;
};

type LobbyEvent = {
  id: string;
  type: string;
  senderId: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  createdAt: number;
};

type Lobby = {
  code: string;
  hostId: string;
  createdAt: number;
  updatedAt: number;
  status: "waiting" | "started";
  revision: number;
  seed: number;
  config: {
    mode: "combat" | "zombie";
    difficulty: string;
    runType: string;
    matchType: "coop" | "private";
  };
  players: Record<string, LobbyPlayer>;
  events: LobbyEvent[];
};

type Store = { version: 1; lobbies: Record<string, Lobby> };

let writeChain: Promise<unknown> = Promise.resolve();

function lobbyPath() {
  return process.env.PLANT_COMBAT_LOBBY_PATH || "/data/combat-lobbies.json";
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

function cleanText(value: unknown, maximum = 48) {
  return String(value || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, maximum);
}

function cleanId(value: unknown, maximum = 96) {
  return cleanText(value, maximum).replace(/[^a-zA-Z0-9_.:-]/g, "-");
}

function cleanCode(value: unknown) {
  return cleanText(value, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function finite(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeState(value: unknown): PlayerState {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    x: finite(source.x), y: finite(source.y), z: finite(source.z),
    yaw: finite(source.yaw), pitch: finite(source.pitch),
    health: Math.max(0, Math.min(100, finite(source.health, 100))),
    shield: Math.max(0, Math.min(100, finite(source.shield, 0))),
    moving: Boolean(source.moving),
    weapon: cleanText(source.weapon, 24),
    alive: source.alive !== false,
    kills: Math.max(0, Math.floor(finite(source.kills))),
    headshots: Math.max(0, Math.floor(finite(source.headshots))),
  };
}

function sanitizeConfig(value: unknown, fallback?: Lobby["config"]): Lobby["config"] {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const mode = source.mode === "zombie" ? "zombie" : source.mode === "combat" ? "combat" : fallback?.mode || "combat";
  const matchType = source.matchType === "private" ? "private" : "coop";
  return {
    mode,
    difficulty: cleanId(source.difficulty || fallback?.difficulty || "normal", 24) || "normal",
    runType: cleanId(source.runType || fallback?.runType || "normal", 24) || "normal",
    matchType,
  };
}

async function readStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(lobbyPath(), "utf8"));
    if (parsed?.version === 1 && parsed?.lobbies && typeof parsed.lobbies === "object") return parsed as Store;
  } catch (error: unknown) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "") : "";
    if (code !== "ENOENT") console.error("combat lobby read failed", error);
  }
  return { version: 1, lobbies: {} };
}

function prune(store: Store, now = Date.now()) {
  for (const [code, lobby] of Object.entries(store.lobbies)) {
    for (const [playerId, player] of Object.entries(lobby.players || {})) {
      if (now - finite(player.lastSeenAt) > PLAYER_STALE_MS) delete lobby.players[playerId];
    }
    const playerIds = Object.keys(lobby.players || {});
    if (!playerIds.length || now - finite(lobby.updatedAt, lobby.createdAt) > LOBBY_EXPIRE_MS) {
      delete store.lobbies[code];
      continue;
    }
    if (!lobby.players[lobby.hostId]) lobby.hostId = playerIds[0];
    lobby.events = (lobby.events || []).filter((event) => now - finite(event.createdAt) < 60_000).slice(-MAX_EVENTS);
  }
}

async function saveStore(store: Store) {
  const target = lobbyPath();
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(store)}\n`, "utf8");
  await rename(temporary, target);
}

async function mutate<T>(operation: (store: Store) => Promise<T> | T): Promise<T> {
  let resolveValue!: (value: T) => void;
  let rejectValue!: (error: unknown) => void;
  const result = new Promise<T>((resolve, reject) => { resolveValue = resolve; rejectValue = reject; });
  writeChain = writeChain.catch(() => {}).then(async () => {
    try {
      const store = await readStore();
      prune(store);
      const value = await operation(store);
      await saveStore(store);
      resolveValue(value);
    } catch (error) { rejectValue(error); }
  });
  await writeChain.catch(() => {});
  return result;
}

function createCode(store: Store) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomBytes(4).toString("base64url").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 5);
    if (code.length === 5 && !store.lobbies[code]) return code;
  }
  return String(Date.now()).slice(-5);
}

function makePlayer(body: Record<string, unknown>, existing?: LobbyPlayer): LobbyPlayer {
  const now = Date.now();
  return {
    id: cleanId(body.playerId || existing?.id || randomBytes(8).toString("hex")),
    name: cleanText(body.name || existing?.name || "Player", 32) || "Player",
    characterId: cleanId(body.characterId || existing?.characterId || "", 120),
    ready: Boolean(body.ready ?? existing?.ready ?? false),
    joinedAt: existing?.joinedAt || now,
    lastSeenAt: now,
    state: body.state ? sanitizeState(body.state) : existing?.state || sanitizeState({}),
  };
}

function publicLobby(lobby: Lobby) {
  return {
    code: lobby.code,
    hostId: lobby.hostId,
    status: lobby.status,
    revision: lobby.revision,
    seed: lobby.seed,
    config: lobby.config,
    players: Object.values(lobby.players).sort((a, b) => a.joinedAt - b.joinedAt),
    events: lobby.events.slice(-MAX_EVENTS),
    updatedAt: lobby.updatedAt,
  };
}

export async function GET(request: Request) {
  if (!ownerSessionValid(request)) return Response.json({ ok: false, error: "Owner password session required." }, { status: 401 });
  const url = new URL(request.url);
  const code = cleanCode(url.searchParams.get("code"));
  const store = await readStore();
  prune(store);
  if (!code) return Response.json({ ok: true, authenticated: true }, { headers: { "cache-control": "no-store" } });
  const lobby = store.lobbies[code];
  if (!lobby) return Response.json({ ok: false, error: "Lobby not found." }, { status: 404, headers: { "cache-control": "no-store" } });
  return Response.json({ ok: true, lobby: publicLobby(lobby), serverTime: Date.now() }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!ownerSessionValid(request)) return Response.json({ ok: false, error: "Owner password session required." }, { status: 401 });
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 }); }
  const action = cleanId(body.action, 24);
  try {
    const response = await mutate(async (store) => {
      const now = Date.now();
      if (action === "create") {
        const player = makePlayer(body);
        const code = createCode(store);
        const config = sanitizeConfig(body.config);
        const lobby: Lobby = {
          code, hostId: player.id, createdAt: now, updatedAt: now,
          status: "waiting", revision: 1, seed: Math.floor(Math.random() * 2_147_483_647),
          config, players: { [player.id]: player }, events: [],
        };
        store.lobbies[code] = lobby;
        return { ok: true, lobby: publicLobby(lobby) };
      }

      const code = cleanCode(body.code);
      const lobby = store.lobbies[code];
      if (!lobby) return { ok: false, status: 404, error: "Lobby not found." };
      const playerId = cleanId(body.playerId, 96);
      const existing = playerId ? lobby.players[playerId] : undefined;

      if (action === "join") {
        if (!existing && Object.keys(lobby.players).length >= MAX_PLAYERS) return { ok: false, status: 409, error: "Lobby is full." };
        const player = makePlayer(body, existing);
        lobby.players[player.id] = player;
        lobby.updatedAt = now;
        lobby.revision += 1;
        return { ok: true, lobby: publicLobby(lobby) };
      }
      if (!playerId || !existing) return { ok: false, status: 403, error: "Join the lobby first." };

      if (action === "heartbeat") {
        lobby.players[playerId] = makePlayer(body, existing);
        lobby.updatedAt = now;
        return { ok: true, lobby: publicLobby(lobby), serverTime: now };
      }
      if (action === "configure") {
        if (lobby.hostId !== playerId) return { ok: false, status: 403, error: "Only the host can change match settings." };
        if (lobby.status === "started") return { ok: false, status: 409, error: "Match already started." };
        lobby.config = sanitizeConfig(body.config, lobby.config);
        lobby.updatedAt = now;
        lobby.revision += 1;
        return { ok: true, lobby: publicLobby(lobby) };
      }
      if (action === "start") {
        if (lobby.hostId !== playerId) return { ok: false, status: 403, error: "Only the host can start the match." };
        lobby.status = "started";
        lobby.updatedAt = now;
        lobby.revision += 1;
        lobby.seed = Math.floor(Math.random() * 2_147_483_647);
        return { ok: true, lobby: publicLobby(lobby) };
      }
      if (action === "reset") {
        if (lobby.hostId !== playerId) return { ok: false, status: 403, error: "Only the host can reset the match." };
        lobby.status = "waiting";
        lobby.events = [];
        Object.values(lobby.players).forEach((player) => { player.ready = false; player.state = sanitizeState({}); });
        lobby.updatedAt = now;
        lobby.revision += 1;
        return { ok: true, lobby: publicLobby(lobby) };
      }
      if (action === "event") {
        const type = cleanId(body.type, 40);
        if (!type) return { ok: false, status: 400, error: "Event type required." };
        const event: LobbyEvent = {
          id: `${now.toString(36)}-${randomBytes(4).toString("hex")}`,
          type,
          senderId: playerId,
          targetId: cleanId(body.targetId, 96) || undefined,
          payload: body.payload && typeof body.payload === "object" ? body.payload as Record<string, unknown> : {},
          createdAt: now,
        };
        lobby.events.push(event);
        if (lobby.events.length > MAX_EVENTS) lobby.events.splice(0, lobby.events.length - MAX_EVENTS);
        lobby.updatedAt = now;
        return { ok: true, event, lobby: publicLobby(lobby) };
      }
      if (action === "leave") {
        delete lobby.players[playerId];
        const remaining = Object.keys(lobby.players);
        if (!remaining.length) delete store.lobbies[code];
        else if (lobby.hostId === playerId) lobby.hostId = remaining[0];
        if (store.lobbies[code]) { lobby.updatedAt = now; lobby.revision += 1; }
        return { ok: true, lobby: store.lobbies[code] ? publicLobby(lobby) : null };
      }
      return { ok: false, status: 400, error: "Unknown lobby action." };
    });
    const status = typeof response === "object" && response && "status" in response ? Number((response as { status?: unknown }).status || 200) : 200;
    return Response.json(response, { status, headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("combat lobby mutation failed", error);
    return Response.json({ ok: false, error: "Lobby service unavailable." }, { status: 500 });
  }
}