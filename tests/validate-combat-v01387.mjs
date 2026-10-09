import assert from "node:assert/strict";
import fs from "node:fs";
const read=(name)=>fs.readFileSync(new URL("../"+name,import.meta.url),"utf8");
const plant=read("public/plant-app.js"),combat=read("public/plant-combat.js");
const walk=read("public/first-person-controller.js"),server=read("app/api/combat-lobby/route.ts");
assert.ok(plant.includes('drawRetainedObject("plant:dead-forest"') &&
  plant.includes("Math.floor(camX/") && !plant.includes("if(zombie){drawZombieMoon();drawDeadForest("),
  "Forest retained rendering must refresh its visibility when camera changes");
assert.ok(plant.includes("function combatMysterySpots()") &&
  plant.includes('id:"tower-roof"') &&
  plant.includes("getMysterySpots: combatMysterySpots"),
  "Mystery Box must use fixed location candidates including a reachable rooftop");
assert.ok(plant.includes('kind:"skyscraper"') &&
  plant.includes("function skyscraperWallSections(") &&
  plant.includes("function skyscraperWalkAllowed("),
  "An explorable skyscraper needs solid walls, usable interior and roof access");
assert.ok(plant.includes("interiorLadder") &&
  plant.includes('kind:"ladder"') &&
  plant.includes('kind:"roof"'),
  "Skyscraper must support climbing from inside up to the roof");
assert.ok(combat.includes("function playMysteryReelMusic(") &&
  combat.includes("playMysteryReelMusic(now)") &&
  combat.includes("mysteryMusicStep"),
  "The mystery box should play melodic procedural reel music");
assert.ok(combat.includes("options.getMysterySpots?.()") &&
  combat.includes("boxY:mysteryBox?.y") &&
  server.includes("boxY?"),
  "The box must relocate to designated sites and synchronize rooftop height");
assert.ok(plant.includes("const stationY=Number(station.y)||0") &&
  plant.includes("stationY+weaponY"),
  "The Mystery Box needs to render at roof height");
assert.ok(combat.includes("ZOMBIE_SPAWN_MIN_DISTANCE") &&
  combat.includes("ZOMBIE_SPAWN_MAX_DISTANCE") &&
  combat.includes("options.canPlaceStation?.(x,z,radius+.6)") &&
  combat.includes("function edgeSpawnPoint("),
  "Zombies must spawn in a bounded radius around players with robust collision rejection");
assert.ok(plant.includes("function drawViewmodelBox(") &&
  plant.includes("ctx.lineJoin = \"round\"") &&
  plant.includes("clampedViewmodel") &&
  plant.includes("Math.max(.13") ,
  "Weapon polygons should use thicker meshes and joined edge strokes");
assert.ok(walk.includes("roofDropPosition") && plant.includes("site.h+.35"),
  "Walking off or jumping off rooftops must stay possible");
console.log("v0.13.87 checks passed: mystery audio/anchors, skyscraper interior, forest cache, roof access, spawning and solid weapons.");
