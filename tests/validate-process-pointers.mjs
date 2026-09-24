import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plant = await readFile(path.join(root, "public", "plant-app.js"), "utf8");
const css = await readFile(path.join(root, "app", "globals.css"), "utf8");

assert.ok(plant.includes('data-object-editor-tab="pointers"'), "Object editor needs a dedicated Pointers tab.");
assert.ok(plant.includes('data-object-editor-panel="pointers"'), "Object editor needs a dedicated process-pointer panel.");
assert.ok(plant.includes('data-process-pointer-field="processPointerAnchorXPercent"'), "Process pointer target X must be independently editable.");
assert.ok(plant.includes('data-process-pointer-field="processPointerScreenOffsetX"'), "Process pointer tag X must be independently editable.");
assert.ok(plant.includes('data-process-pointer-field="processPointerColor"'), "Process pointer color must be independently editable.");
assert.ok(plant.includes('data-process-pointer-field="processPointerShape"'), "Process pointer line shape must be independently editable.");
assert.ok(plant.includes('data-process-pointer-field="processPointerEndStyle"'), "Process pointer endpoint must be independently editable.");
assert.ok(plant.includes('data-process-pointer-check="processPointerVisible"'), "Process pointer leader visibility must be independently editable.");

const normalizeStart = plant.indexOf("function normalizeMachine");
const normalizeEnd = plant.indexOf("function defaultAnimationObjects", normalizeStart);
const normalizeBody = plant.slice(normalizeStart, normalizeEnd);
assert.ok(normalizeBody.includes("processPointerAnchorXPercent"), "Saved machines must normalize process pointer geometry.");
assert.ok(normalizeBody.includes("machine.labelAnchorXPercent"), "Existing label pointer geometry must migrate into the new process pointer fields.");

const flowStart = plant.indexOf("function drawTodayProductionFlow");
const flowEnd = plant.indexOf("function rectanglesIntersect", flowStart);
const flowBody = plant.slice(flowStart, flowEnd);
for (const field of [
  "processPointerAnchorXPercent",
  "processPointerAnchorYPercent",
  "processPointerAnchorZPercent",
  "processPointerLabelOffset",
  "processPointerScreenOffsetX",
  "processPointerScreenOffsetY",
  "processPointerColor",
  "processPointerWidth",
  "processPointerOpacity",
  "processPointerStyle",
  "processPointerShape",
  "processPointerLeaderSide",
  "processPointerEndStyle",
  "processPointerEndSize",
]) {
  assert.ok(flowBody.includes(field), `Today production flow must use independent ${field}.`);
}
assert.ok(!flowBody.includes("machine.labelAnchorXPercent"), "Today production flow must no longer use the normal machine-label pointer anchor.");
assert.ok(!flowBody.includes("machine.labelLineColor"), "Today production flow must no longer use the normal machine-label line styling.");

const labelControlsStart = plant.indexOf('<fieldset class="label-controls">');
const labelControlsEnd = plant.indexOf('<fieldset class="crane-controls">', labelControlsStart);
const labelControls = plant.slice(labelControlsStart, labelControlsEnd);
assert.ok(!labelControls.includes("data-process-pointer-field"), "Normal machine labels must not contain process-pointer controls.");
assert.ok(labelControls.includes("normal machine label text and appearance"), "Normal label section should explain the process-pointer separation.");

assert.ok(css.includes("var(--editor-viewport-max-height"), "Layout editor height must be constrained by the real browser viewport.");
assert.ok(plant.includes("window.innerHeight - absolutePanelTop"), "Editor must compute remaining visible browser height.");
assert.ok(css.includes("grid-template-columns: repeat(5, minmax(0, 1fr))"), "Desktop object editor needs room for the new fifth tab.");
assert.ok(css.includes(".process-pointer-panel"), "Dedicated pointer controls need their own styling.");

console.log("Independent process-pointer editor and viewport containment checks passed.");
