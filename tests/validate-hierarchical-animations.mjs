import fs from "node:fs";
import assert from "node:assert/strict";

const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const studioHtml = fs.readFileSync(new URL("../public/machine-studio.html", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const timeline = fs.readFileSync(new URL("../public/animation-timeline.js", import.meta.url), "utf8");

assert.ok(studio.includes("playOwnAnimation"), "Merged child local-animation control is missing.");
assert.ok(studioHtml.includes("timeline-target-picker"), "Merged child timeline selector is missing.");
assert.ok(studio.includes("fourStepPathOffset"), "Designer four-step path helper is missing.");
assert.ok(timeline.includes('{ value: "fourStep"'), "Designer four-step timeline type is missing.");
assert.ok(studioHtml.includes("This child timeline plays inside the merged assembly") || studio.includes("target.playOwnAnimation = true"), "Merged-child local timeline playback is missing.");
assert.ok(plant.includes("machineFourStepOffset"), "Plant four-step path helper is missing.");
assert.ok(plant.includes("designComponentFourStepOffset"), "Plant custom-design four-step helper is missing.");
assert.ok(plant.includes("data-motion-own-animation"), "Attached scene-child own-animation control is missing.");
assert.ok(plant.includes("animationSecondaryDistance"), "Second path distance is missing.");
assert.ok(plant.includes("machine.playOwnAnimation === false"), "Explicit inherited-only scene motion is missing.");
assert.ok(!studio.includes("sharesDriverMotion ="), "Automatic matching-animation suppression should be replaced by explicit control.");
assert.ok(!plant.includes("const sharesDriverMotion ="), "Plant custom designs should use explicit child animation layers.");

console.log("Hierarchical child animation and four-step path checks passed.");

// Four-step path requirement model. Axis 1 = Y and axis 2 = Z should visit
// origin -> up -> up+forward -> forward -> origin without changing X.
const origin = [0, 0, 0];
const axisOne = [0, 6, 0];
const axisTwo = [0, 0, 10];
const corners = [
  origin,
  origin.map((value, index) => value + axisOne[index]),
  origin.map((value, index) => value + axisOne[index] + axisTwo[index]),
  origin.map((value, index) => value + axisTwo[index]),
  origin,
];
assert.deepEqual(corners, [
  [0, 0, 0],
  [0, 6, 0],
  [0, 6, 10],
  [0, 0, 10],
  [0, 0, 0],
], "Four-step path does not represent up, forward, down, and backward movement.");
