import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plantApp = await readFile(path.join(root, "public", "plant-app.js"), "utf8");

for (const type of ["safetyLine", "trench", "floorDrain"]) {
  assert.ok(plantApp.includes(`type: "${type}"`) || plantApp.includes(`value="${type}"`), `Missing editable floor feature: ${type}`);
}
assert.ok(plantApp.includes("floorFeaturesInitialized: true"), "Floor-feature initialization marker is not persisted.");
assert.ok(plantApp.includes("defaultFloorFeatureObjects"), "Default floor-feature migration is missing.");
assert.ok(plantApp.includes("mergeDefaultFloorFeatureObjects"), "Floor-feature merge logic is missing.");
assert.ok(!plantApp.includes("function drawTrenches()"), "Legacy hard-coded trench rendering still exists.");
assert.ok(!plantApp.includes("function drawSafety()"), "Legacy hard-coded safety-line rendering still exists.");
assert.ok(plantApp.includes("Select floor feature") && plantApp.includes("select-floor-feature"), "Floor-feature quick selection is missing.");
assert.ok(plantApp.includes("Square floor drain") && plantApp.includes("lineCount"), "Square floor-drain grate rendering is incomplete.");
assert.ok(plantApp.includes("pathDirection = rotateVector3(localDirection, ...objectRotation(machine))"), "Animation movement does not follow object rotation.");
assert.ok(plantApp.includes("Reverse movement direction") && plantApp.includes("animationDistance = -"), "Animation direction reversal control is missing.");

console.log("Editable floor-feature and animation-direction regression checks passed.");
