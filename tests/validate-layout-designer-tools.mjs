import assert from "node:assert/strict";
import fs from "node:fs";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const studioPage = fs.readFileSync(new URL("../app/machine-studio/page.tsx", import.meta.url), "utf8");
const staticStudioPage = fs.readFileSync(new URL("../public/machine-studio.html", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

assert.match(plant, /item\.scaleEditMode = "individual";\s*if \(item\.designId\) item\.designScaleMode = "stretch";\s*resizeMachineAroundCenter/,
  "Individual layout dimensions must persist by switching linked designs to stretch mode.");
assert.match(studio, /machine\.scaleEditMode = "individual";\s*if \(machine\.designId\) machine\.designScaleMode = "stretch";\s*resizePlantMachine/,
  "Studio layout assignments must preserve individual dimensions too.");

const rollerBranch = plant.slice(plant.indexOf('component.type === "rollerBed"', plant.indexOf("function drawCustomDesign")));
assert.ok(rollerBranch.includes("drawCylinder3d({"), "Plant roller beds must use dimensional 3D cylinders instead of thin screen-space lines.");
assert.ok(plant.includes("function designRollerFrame(component, index, count)"), "Plant roller placement must share one Designer-parity frame calculation.");
assert.ok(rollerBranch.includes("segments: 6") && rollerBranch.includes("outline: false"), "Overview rollers must use the low-cost dimensional mesh.");

assert.ok(plant.includes("function drawLayoutRulers()"), "Layout editing needs a scale ruler overlay.");
assert.match(plant, /depthRenderer\.render\(\);\s*drawLayoutRulers\(\);/, "Rulers must render as a readable UI overlay after the 3D scene.");
assert.ok(plant.includes('`${Math.round(x - minX)} ft`') && plant.includes('`${Math.round(z - minZ)} ft`'), "Ruler ticks must be labeled in feet from the plant corner.");

for (const source of [studioPage, staticStudioPage]) {
  assert.ok(source.includes('id="duplicate-component"'), "Both Designer entry pages must expose the duplicate button.");
  assert.ok(source.includes('data-add-component="text"'), "Both Designer entry pages must expose a text-label part.");
  assert.ok(source.includes('data-component-field="text"'), "Text labels need an editable content field.");
}
for (const key of ["c", "v", "x", "z", "y", "d"]) {
  assert.ok(studio.includes(`event.key.toLowerCase() === "${key}"`), `Designer shortcut Ctrl+${key.toUpperCase()} is missing.`);
}
assert.ok(studio.includes("componentClipboard"), "Designer copy, cut, and paste need an internal parts clipboard.");
assert.ok(studio.includes("cloneComponentTreeForEmbedding(component)"), "Duplicated and pasted groups must receive fresh nested IDs.");
const designerPaste = studio.slice(studio.indexOf("function pasteComponents()"), studio.indexOf("function cutSelectedComponents()"));
assert.ok(!designerPaste.includes("translateComponent("), "Pasted Designer parts must retain the copied coordinates exactly.");
const plantPaste = plant.slice(plant.indexOf("function pasteMachine()"), plant.indexOf("function swapStageReferences("));
assert.ok(!plantPaste.includes("+ 8") && !plantPaste.includes("state.clipboard = clone(pasted)"), "Pasted layout objects must retain the copied coordinates on every paste.");
assert.match(studio, /currentAngle - drag\.startAngle/, "Rotation dragging must use the selected object's current screen-space pivot.");
assert.ok(studio.includes("const screenVertical = safeDeltaY / Math.max(1, scale)") && studio.includes("state.panY += screenVertical * cp"),
  "Middle-button movement must follow the camera screen-up vector at every pitch.");
assert.ok(studio.includes("function stabilizedPanDelta(") && !studio.includes("PAN_AXIS_LOCK_RATIO") && studio.includes("Math.hypot(screenX, screenY)"),
  "Middle-button panning must preserve diagonal motion without an abrupt axis lock.");
assert.ok(studio.includes("MAX_PAN_POINTER_DELTA = 160") && studio.includes("safeDeltaX") && studio.includes("safeDeltaY"),
  "Middle-button panning must preserve low-frequency pointer movement while rejecting cursor-warp spikes.");
assert.ok(studio.includes("const rz = screenVertical * sp") && studio.includes("y -= state.panY"),
  "Vertical panning must combine floor depth and world height without losing motion near a horizontal view.");
assert.match(studio, /state\.drag = \{ kind: "orbit" \}/,
  "Right-button orbit must use the direct orbit direction on both sides of the floor.");
assert.match(studio, /state\.pitch = clamp\(state\.pitch \+ deltaY \* 0\.004, -1\.53, 1\.53\)/,
  "Below-floor right-button orbit must not apply a second directional inversion.");
assert.ok(!styles.includes("#machine-design-canvas.below-floor-view"), "Below-floor viewing must not darken the Designer environment.");
assert.ok(studio.includes('"text", "group"') && studio.includes("drawTextComponentOverlays(components)"), "Text-label geometry and visible text overlays must render in the Designer.");
assert.ok(plant.includes("drawDesignTextLabels(rendered, alpha, grow, time)"), "Saved text labels must also render in the plant layout.");
assert.match(styles, /\.viewport-toolrail button \{[^}]*color: #294b43;[^}]*opacity: 1;/s, "Designer tool buttons need opaque, high-contrast styling.");

console.log("Layout ruler, exact paste, below-floor navigation, roller sizing, text, shortcuts, and Designer controls validated.");
