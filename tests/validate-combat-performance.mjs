import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plant = await readFile(new URL("../public/plant-app.js", import.meta.url), "utf8");
const combat = await readFile(new URL("../public/plant-combat.js", import.meta.url), "utf8");
const multiplayer = await readFile(new URL("../public/combat-multiplayer.js", import.meta.url), "utf8");
const api = await readFile(new URL("../app/api/combat-lobby/route.ts", import.meta.url), "utf8");

assert.ok(
  plant.includes("COMBAT_OCCLUDER_CACHE_MS") && plant.includes("combatOccluderCache"),
  "Combat occluders must be cached briefly so every enemy does not rebuild all animated machine/glass geometry several times per frame."
);
assert.ok(
  combat.includes("smoothCoopEnemyVisuals") && combat.includes("remoteSync"),
  "Co-op follower enemies must interpolate/extrapolate between host snapshots instead of teleporting to each network update."
);
assert.ok(
  !combat.includes("if (coopFollower()) {\n        applyHostEnemySyncState(multiplayer?.getLobby?.());"),
  "Co-op followers must not reconcile the complete host enemy snapshot every animation frame."
);
assert.ok(
  combat.includes("HOST_ENEMY_SYNC_INTERVAL_MS") && combat.includes("cachedEnemySyncState"),
  "The host must reuse a cached compact enemy snapshot instead of rebuilding the full enemy array on every player heartbeat."
);
assert.ok(
  api.includes("mergePlayerState") && api.includes("source.enemies === undefined"),
  "The lobby service must preserve the last host world snapshot when a lightweight heartbeat omits enemies/glass."
);
assert.ok(
  api.includes("mutateHeartbeat") && api.includes('action === "heartbeat" ? mutateHeartbeat'),
  "Gameplay heartbeats must bypass the durable write queue so disk persistence cannot stall movement sync."
);
assert.ok(
  combat.includes('if (roundState === "setup") syncLobbyUi(lobby);'),
  "Gameplay heartbeats must avoid rebuilding the hidden lobby/setup DOM while a match is running."
);

console.log("Combat/co-op performance regression checks passed.");
