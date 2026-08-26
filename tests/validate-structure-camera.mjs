import assert from "node:assert/strict";
import fs from "node:fs";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const designs = fs.readFileSync(new URL("../public/machine-designs.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

assert.ok(plant.includes("MAX_FLOOR_DIMENSION = 5000"), "Floor dimensions must be bounded.");
assert.ok(plant.includes("MAX_FLOOR_GRID_LINES = 120"), "Large floors need a bounded adaptive grid.");
assert.ok(plant.includes("niceGridStep"), "Floor grid spacing must adapt to the structure size.");
const updateStart = plant.indexOf("function updateEditorPanel");
const createStart = plant.indexOf("function createEditorPanel");
const updateBody = plant.slice(updateStart, createStart);
assert.ok(!updateBody.includes('[data-floor-field]").forEach((input) => {\n      input.addEventListener'), "Floor listeners must not accumulate during panel refreshes.");
assert.ok(plant.includes('data-toggle="walk"'), "Plant needs a walkthrough camera control.");
assert.ok(plant.includes('data-view="low"'), "Plant needs a low-angle camera preset.");
assert.ok(plant.includes("state.cameraMode === \"walk\""), "Walkthrough movement logic is missing.");
assert.ok(studio.includes('view === "low"'), "Designer needs a low-angle camera preset.");
assert.ok(studio.includes("0.1, 10"), "Designer must allow closer zoom.");
assert.match(plant, /canvas\.addEventListener\("mousedown", \(event\) => \{\s*if \(event\.button === 1\) event\.preventDefault\(\);/, "Plant canvas must suppress native middle-button autoscroll.");
assert.match(plant, /canvas\.addEventListener\("auxclick", \(event\) => \{\s*if \(event\.button === 1\) event\.preventDefault\(\);/, "Plant canvas must suppress the middle-button auxiliary click default.");
assert.match(studio, /canvas\.addEventListener\("mousedown", \(event\) => \{\s*if \(event\.button === 1\) event\.preventDefault\(\);/, "Designer canvas must suppress native middle-button autoscroll.");
assert.match(studio, /canvas\.addEventListener\("auxclick", \(event\) => \{\s*if \(event\.button === 1\) event\.preventDefault\(\);/, "Designer canvas must suppress the middle-button auxiliary click default.");
assert.ok(studio.includes("state.panX -= rx * cy + rz * sy;") && studio.includes("state.panZ -= -rx * sy + rz * cy;"), "Designer middle-drag must use slicer-style grab navigation.");
assert.ok(studio.includes("event.deltaY > 0 ? 0.9 : 1.1"), "Designer wheel-up must zoom in and wheel-down must zoom out.");
assert.ok(plant.includes("state.panX -= rx*cy + rz*sy;") && plant.includes("state.panZ -= -rx*sy + rz*cy;"), "Plant and Designer must share slicer-style middle-drag panning.");
assert.ok(plant.includes("event.deltaY > 0 ? .9 : 1.1"), "Plant and Designer must share wheel-up zoom in and wheel-down zoom out.");
assert.ok(plant.includes("clamp(state.pitch + deltaY * .004") && studio.includes("clamp(state.pitch + deltaY * 0.004"), "Plant and Designer must share the same vertical orbit direction and sensitivity.");
assert.ok(studio.includes("-1.53, 1.53"), "Designer vertical orbit must cross below the floor plane.");
assert.ok(studio.includes('const belowFloor = state.pitch < 0;'), "Designer must detect below-floor camera positions.");
assert.ok(studio.includes('{ transparent: belowFloor }'), "Designer floor must become translucent below the model.");
assert.ok(studio.includes("function signedNavigationPitchScale()") && studio.includes("direction * Math.max(DEFAULT_PAN_PITCH_SCALE"), "Designer pan and screen mapping must reverse below-floor direction without a sensitivity spike.");
assert.ok(!css.includes("#machine-design-canvas.below-floor-view"), "Below-floor viewing must keep the same environment color as above the floor.");
assert.ok(plant.includes("if (!wantsOrbit && !wantsPan) return;"), "Plant view must reserve ordinary left-drag for editing instead of camera orbit.");
assert.ok(css.includes("walkthrough-reticle"), "Walkthrough reticle styling is missing.");
for (const id of ["safety-line-standard", "utility-trench-standard", "floor-drain-standard"]) {
  assert.ok(designs.includes(id), `${id} is missing from the Design Studio library.`);
}
console.log("Structure safety, floor-feature design, and camera checks passed.");
