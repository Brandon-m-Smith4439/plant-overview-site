import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=name=>fs.readFileSync(new URL("../"+name,import.meta.url),"utf8");
const combat=read("public/plant-combat.js"),server=read("app/api/combat-lobby/route.ts");
const css=read("app/globals.css"),net=read("public/combat-multiplayer.js");
const from=combat.indexOf("function splashDamage(");
assert.ok(from>=0,"Missing splash damage logic");
const until=combat.indexOf("function resolveExplosionDamage(",from);
const splash=vm.runInNewContext("("+combat.slice(from,until).trim()+")",{
  number:(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback,
  clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),
  hasLineOfSight:()=>true,
  Math
});
const origin={x:0,y:0,z:0};
assert.ok(splash(origin,{x:12,y:0,z:0},16,200)>=45,
  "Rocket splash must be dangerous throughout a wider blast area");
assert.ok(splash(origin,{x:17,y:0,z:0},18,225)>0,
  "Nearby explosive barrels must have stronger useful outer-range splash");
assert.ok(combat.includes('explosionRadius: 16') && combat.includes('damage: 200'),
  "Player rocket weapon must have increased splash radius and explosive damage");
assert.ok(combat.includes('radius:18') && combat.includes('damageMax:225'),
  "Shootable map explosives must have increased splash radius and power");
assert.ok(combat.includes("function playWorldCombatSound(") &&
  combat.includes("function soundPanFromWorld("),
  "World sounds must use camera-relative direction and distance attenuation");
assert.ok(combat.includes('playWorldCombatSound("explosion"') &&
  combat.includes('playWorldCombatSound("enemy-shot"') &&
  combat.includes('playWorldCombatSound("zombie-growl"'),
  "Explosions, gunfire, and zombie ambience must be spatialized");
assert.ok(server.includes('action === "game-over"') &&
  server.includes('action === "rematch-vote"') &&
  server.includes("roundGeneration"),
  "Server must own game-over result and unanimous rematch votes");
assert.ok(server.includes("rematchVotes") && server.includes("finalLeaderboard"),
  "Match result and vote tally must be shared consistently");
assert.ok(net.includes("async function voteRematch(") && net.includes("async function endCoopRound("),
  "All co-op clients need authoritative vote and game-over actions");
assert.ok(combat.includes("function checkCoopGameOver(") &&
  combat.includes("function finishCoopGameOver("),
  "Host must detect all-human-down and show the shared game over");
assert.ok(combat.includes("GAME OVER") &&
  combat.includes("Vote to play again") &&
  combat.includes("DOWNS"),
  "Game over must show team stats and a replay vote");
assert.ok(combat.includes("lastRematchGeneration") &&
  combat.includes("roundGeneration"),
  "Every client should restart exactly once from the server vote result");
assert.ok(css.includes(".combat-round-overlay.coop-game-over"),
  "Co-op game over needs a distinct readable overlay");
console.log("v0.13.89 checks passed: shared co-op game over, vote quorum, splash damage and 3D sound.");
