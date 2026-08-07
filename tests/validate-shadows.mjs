import assert from "node:assert/strict";
import fs from "node:fs";

const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const renderer = fs.readFileSync(new URL("../public/depth-scene-renderer.js", import.meta.url), "utf8");

assert.ok(plant.includes("function drawSoftGroundShadow"), "Plant soft-shadow renderer is missing.");
assert.ok(plant.includes("drawSceneShadows(machineEntries, time)"), "Plant shadows are not called for visible scene objects.");
assert.ok(plant.includes("function drawMachineShadowCasters"), "Plant must calculate shadows from actual model components.");
assert.ok(plant.includes("designComponentShadowPoints"), "Custom design parts need individual shadow footprints.");
assert.ok(plant.includes('["bridgeCrane", "craneMachine"]'), "Cranes need narrow post-and-beam shadow handling.");
assert.ok(studio.includes("function drawDesignerShadow"), "Designer shadow renderer is missing.");
assert.ok(studio.includes("components.slice(0, shadowLimit).forEach(drawDesignerShadow)"), "Designer shadows are not rendered with a bounded component budget.");
assert.ok(renderer.includes("transparentTriangles"), "Depth-tested transparent rendering needed by shadows is missing.");
assert.ok(plant.includes("depthBias: -0.0002"), "Plant shadows lack floor depth-bias protection.");
console.log("Component-accurate projected shadow checks passed.");
