import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const combat = await readFile(new URL("../public/plant-combat.js", import.meta.url), "utf8");
const plant = await readFile(new URL("../public/plant-app.js", import.meta.url), "utf8");
const api = await readFile(new URL("../app/api/combat-lobby/route.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

assert.ok(combat.includes('event.type === "coop-victory"'), "Co-op followers must consume a host-authored victory result.");
assert.ok(combat.includes('sendEvent?.("coop-victory"'), "The co-op host must broadcast victory to all teammates.");
assert.ok(combat.includes("renderRoundLeaderboard") && combat.includes("data-combat-scoreboard"), "Round-end UI must render a multiplayer kills/deaths leaderboard.");
assert.ok(combat.includes("playerDeaths") && api.includes("deaths?: number") && api.includes("deaths: Math.max"), "Deaths must be tracked and synchronized per player.");
assert.ok(combat.includes("canRespawnAfterDeath") && combat.includes("beginPlayerRespawn") && combat.includes("updatePlayerRespawn"), "Combat and normal zombie mode need a downed/respawn lifecycle.");
assert.ok(combat.includes('zombieRunType === "normal"') && combat.includes('matchType !== "private"'), "Respawning must apply to AI combat/normal zombies but not private PvP or Endless.");
assert.ok(combat.includes('alive:!["lost","respawning"].includes(roundState)'), "Multiplayer state must advertise a respawning player as temporarily down.");
assert.ok(plant.includes("carrierGlassComponent") && plant.includes("proceduralCombatGlassOccluders"), "Glass racks/A-frames/trucks need carrier-aware and procedural glass hitboxes.");
assert.ok(plant.includes("COMBAT_EXPLOSION_VISUAL_SCALE = 3") && plant.includes("COMBAT_GLASS_SHATTER_VISUAL_SCALE = 3"), "Rocket and glass explosion visuals must be 300% of their previous scale.");
assert.ok(css.includes(".combat-scoreboard"), "The multiplayer leaderboard must have dedicated round-end styling.");

console.log("v0.13.75 co-op victory, respawn, leaderboard, glass, and explosion checks passed.");
