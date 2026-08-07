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
assert.ok(plant.includes('canvas.addEventListener("mousedown", (event) => {\n    if (event.button === 1) event.preventDefault();'), "Plant canvas must suppress native middle-button autoscroll.");
assert.ok(plant.includes('canvas.addEventListener("auxclick", (event) => {\n    if (event.button === 1) event.preventDefault();'), "Plant canvas must suppress the middle-button auxiliary click default.");
assert.ok(studio.includes('canvas.addEventListener("mousedown", (event) => {\n    if (event.button === 1) event.preventDefault();'), "Designer canvas must suppress native middle-button autoscroll.");
assert.ok(studio.includes('canvas.addEventListener("auxclick", (event) => {\n    if (event.button === 1) event.preventDefault();'), "Designer canvas must suppress the middle-button auxiliary click default.");
assert.ok(css.includes("walkthrough-reticle"), "Walkthrough reticle styling is missing.");
for (const id of ["safety-line-standard", "utility-trench-standard", "floor-drain-standard"]) {
  assert.ok(designs.includes(id), `${id} is missing from the Design Studio library.`);
}
console.log("Structure safety, floor-feature design, and camera checks passed.");
