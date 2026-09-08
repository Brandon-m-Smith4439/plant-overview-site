import assert from "node:assert/strict";
import fs from "node:fs";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const performanceController = fs.readFileSync(new URL("../public/render-performance.js", import.meta.url), "utf8");

assert.match(plant, /const OVERVIEW_CAMERA = Object\.freeze\(\{[\s\S]*pitch: 0\.52,[\s\S]*zoom: 1\.18,/, "Overview must use the closer, slightly lower completed-plant camera.");
assert.match(plant, /Object\.assign\(state, OVERVIEW_CAMERA\)/, "The Overview button must restore the shared camera preset.");
assert.match(plant, /state\.cameraMode !== "walk" && !isFloorFeatureType\(machine\.type\) \? 3 : 0/, "Every overview machine must render its complete component geometry.");
assert.match(plant, /level = Math\.max\(level, minimumOverviewLevel\)/, "Full overview machine detail must override distance-based LOD.");
assert.match(plant, /visibleDesignComponents\(design, time\)/, "The cutting table and other designs must keep their live overview animation clock.");
assert.doesNotMatch(plant, /shouldFreezeInternalDesignAnimation/, "Overview cutting animation must not be frozen.");
assert.match(plant, /function representativeDesignComponents[\s\S]*"glassPanel", "wheel", "text", "rollerBed", "wedge"/, "Compact LOD must sample recognizable details across the complete machine.");
assert.doesNotMatch(plant, /const previousLevel = machineLodHistory/, "Returning to a zoom level must not remain trapped behind directional LOD history.");
assert.match(plant, /\|\| lodLevel < 2/, "Repeated overview machines must support instancing at silhouette LOD.");
assert.match(plant, /drawCustomDesign\(canonical, 1, 1, time, lodLevel\)/, "Instanced templates must match their selected overview LOD.");
assert.match(plant, /state\.cameraMode !== "walk"[\s\S]*single footprint shadow/, "Overview shadows must use stable machine footprints.");
assert.match(plant, /: machineHasLayoutMotion\(entry\.machine\)/, "Internal component animation must not churn overview shadows.");
assert.match(performanceController, /return modeConfig\(\)\.maxShadowMachines;/, "Auto performance must keep a stable shadow-caster count.");
assert.match(performanceController, /slowWindows >= 2 && adaptiveElapsed >= 1200/, "Auto detail reduction must require sustained slow frames.");
assert.match(performanceController, /fastWindows >= 12 && adaptiveElapsed >= 3000/, "Auto detail recovery must not oscillate rapidly.");

console.log("Full overview detail, live cutting animation, zoom restoration, shadows, and camera checks passed.");
