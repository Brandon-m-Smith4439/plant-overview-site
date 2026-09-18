import assert from "node:assert/strict";
import fs from "node:fs";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const designs = fs.readFileSync(new URL("../public/machine-designs.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

assert.ok(plant.includes("MAX_FLOOR_DIMENSION = 5000"), "Floor dimensions must be bounded.");
assert.ok(plant.includes("MAX_FLOOR_GRID_LINES = 120"), "Large floors need a bounded adaptive grid.");
assert.ok(plant.includes("defaultRoofSettings") && plant.includes("leftHeight: 50") && plant.includes("rightHeight: 75"), "The editable roof must default to 50 ft on the left and 75 ft on the right.");
assert.ok(plant.includes("function drawRoofTruss") && plant.includes("function drawRoof"), "The plant needs a roof and black truss rendering system.");
assert.ok(plant.includes("const roofColor = state.roof.roofColor") && plant.includes("function drawTrussMember"), "First person must honor the selected roof color while retaining solid thick truss members.");
assert.ok(plant.includes("function displayedWallSections") && plant.includes("state.roof.leftHeight") && plant.includes("state.roof.rightHeight"), "Visible roof sections must extend their matching walls to the configured height.");
assert.ok(plant.includes("function displayedRoofProfile") && plant.includes("function displayedColumnHeight"), "Pillars need the same active roof-height profile as the walls and trusses.");
assert.ok(plant.includes("h: displayedColumnHeight(column, columnRoofProfile)") && plant.includes("const height = displayedColumnHeight(column)"), "Both fast and fallback pillar renderers must extend pillars to the visible ceiling.");
assert.ok(plant.includes("function updateSkyBackground") && plant.includes('state.cameraMode === "walk"') && css.includes("--sky-x") && css.includes("background-position"), "The overview sky must stay anchored while first-person look direction can reveal the wider cloud field.");
assert.ok(plant.includes('data-roof-field="splitPercent"') && plant.includes('data-roof-field="trussSpacing"'), "Structure editing must expose the roof split and truss spacing.");
assert.ok(plant.includes("roof: clone(state.roof)") && plant.includes("roof: state.roof"), "Roof configuration must survive history, export, and browser persistence.");
assert.ok(plant.includes("niceGridStep"), "Floor grid spacing must adapt to the structure size.");
const updateStart = plant.indexOf("function updateEditorPanel");
const createStart = plant.indexOf("function createEditorPanel");
const updateBody = plant.slice(updateStart, createStart);
assert.ok(!updateBody.includes('[data-floor-field]").forEach((input) => {\n      input.addEventListener'), "Floor listeners must not accumulate during panel refreshes.");
assert.ok(plant.includes('data-toggle="walk"'), "Plant needs a walkthrough camera control.");
assert.ok(!plant.includes('data-view="low"'), "The retired Plant Layout low-angle button must stay out of the simplified public controls.");
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
assert.ok(studio.includes("state.panY += screenVertical * cp") && studio.includes("const rz = screenVertical * sp"), "Designer panning must follow camera screen-up without slowing at horizontal pitch.");
assert.ok(studio.includes("centerY: state.panY"), "The GPU view must receive the Designer's vertical pan so selection outlines stay attached to their parts.");
assert.ok(fs.readFileSync(new URL("../public/three-depth-scene-renderer.js", import.meta.url), "utf8").includes("- cp * centerY"), "The retained renderer must apply vertical camera-center translation.");
assert.ok(studio.includes("MAX_PAN_POINTER_DELTA = 160;") && studio.includes("function stabilizedPanDelta("), "Designer panning must preserve normal pointer movement while rejecting only cursor-warp spikes.");
const baseFieldHandlerStart = studio.indexOf("const designFieldMap = {");
const baseFieldHandlerEnd = studio.indexOf("function addComponentOfType", baseFieldHandlerStart);
assert.ok(!studio.slice(baseFieldHandlerStart, baseFieldHandlerEnd).includes("fitView();"), "Editing Designer envelope dimensions must preserve the current camera.");
const fitEnvelopeHandlerStart = studio.indexOf('document.getElementById("fit-envelope")');
const fitEnvelopeHandlerEnd = studio.indexOf('document.getElementById("show-design-envelope")', fitEnvelopeHandlerStart);
assert.ok(!studio.slice(fitEnvelopeHandlerStart, fitEnvelopeHandlerEnd).includes("fitView();"), "Fitting the Designer envelope to parts must preserve the current camera.");
const pointerMoveStart = studio.indexOf('canvas.addEventListener("pointermove", (event) => {');
const pointerMoveEnd = studio.indexOf('canvas.addEventListener("pointerup", finishPointer);', pointerMoveStart);
const pointerMove = studio.slice(pointerMoveStart, pointerMoveEnd);
assert.ok(pointerMove.includes('state.drag.kind === "orbit"') && pointerMove.includes('state.drag.kind === "pan"'), "Designer camera input must use one shared orbit and pan path.");
assert.ok(!pointerMove.includes("state.pitch < 0") && !pointerMove.includes("belowFloor"), "Designer camera controls must not switch direction or sensitivity below the floor.");
assert.ok(studio.includes("event.deltaY > 0 ? 0.9 : 1.1"), "Designer wheel zoom must use one consistent direction at every camera angle.");
const projectedVerticalDrag = (pitch, deltaY, scale) => {
  const screenVertical = deltaY / scale;
  const panY = screenVertical * Math.cos(pitch);
  const panZ = screenVertical * Math.sin(pitch);
  return (panY * Math.cos(pitch) + panZ * Math.sin(pitch)) * scale;
};
for (const scale of [8, 40, 100, 500]) {
  for (const pitch of [-1.5, -1.2, -0.62, -0.025, 0, 0.025, 0.62, 1.2, 1.5]) {
    const movement = projectedVerticalDrag(pitch, 16, scale);
    assert.ok(Math.abs(movement - 16) < 1e-9, `Vertical middle-drag must remain 1:1 at pitch ${pitch} and scale ${scale}.`);
  }
}
const stabilizePanDelta = (deltaX, deltaY) => {
  const screenX = Number(deltaX) || 0;
  const screenY = Number(deltaY) || 0;
  const distance = Math.hypot(screenX, screenY);
  if (distance <= 160) return [screenX, screenY];
  const limitScale = 160 / distance;
  return [screenX * limitScale, screenY * limitScale];
};
assert.deepEqual(stabilizePanDelta(40, 2), [40, 2], "Normal diagonal movement must retain both pointer axes.");
const stabilizedDiagonal = stabilizePanDelta(400, 400);
assert.ok(Math.abs(Math.hypot(...stabilizedDiagonal) - 160) < 1e-9, "Only a cursor-warp-sized diagonal spike should be limited.");
const projectedHorizontalDrag = (pitch, yaw, deltaX) => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const rx = deltaX;
  const panX = -(rx * cy);
  const panZ = rx * sy;
  return {
    x: -(panX * cy - panZ * sy),
    y: Math.sin(pitch) * -(panX * sy + panZ * cy),
  };
};
for (const yaw of [-2.1, -0.72, 0, 0.9, 2.4]) {
  for (const pitch of [-1.2, -0.62, 0.62, 1.2]) {
    const movement = projectedHorizontalDrag(pitch, yaw, 16);
    assert.ok(Math.abs(movement.x - 16) < 1e-9 && Math.abs(movement.y) < 1e-9, "Horizontal middle-drag must stay horizontal at every tested camera angle.");
  }
}
assert.ok(!css.includes("#machine-design-canvas.below-floor-view"), "Below-floor viewing must keep the same environment color as above the floor.");
assert.ok(plant.includes("if (!wantsOrbit && !wantsPan) return;"), "Plant view must reserve ordinary left-drag for editing instead of camera orbit.");
assert.ok(css.includes("walkthrough-reticle"), "Walkthrough reticle styling is missing.");
for (const id of ["safety-line-standard", "utility-trench-standard", "floor-drain-standard"]) {
  assert.ok(designs.includes(id), `${id} is missing from the Design Studio library.`);
}
console.log("Structure safety, floor-feature design, and camera checks passed.");
