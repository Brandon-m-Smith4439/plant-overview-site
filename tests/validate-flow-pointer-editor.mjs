import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plant = await readFile(new URL("../public/plant-app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

assert.ok(plant.includes('data-editor-tool="flow"'), "Layout editor must expose a dedicated Flow section.");
assert.ok(plant.includes('data-editor-section="flow"'), "Flow controls must be separate from regular object/label controls.");
assert.ok(plant.includes("FLOW_POINTER_DEFINITIONS"), "Production flow links need stable pointer definitions.");
assert.ok(plant.includes("normalizeFlowPointers"), "Process pointer settings must be normalized and migration-safe.");
assert.ok(plant.includes("flowPointers: state.flowPointers"), "Process pointer settings must persist with layout exports/storage.");
assert.ok(plant.includes("flowPointers: clone(state.flowPointers)"), "Undo/redo snapshots must include process pointer edits.");
assert.ok(plant.includes("state.flowPointers = normalizeFlowPointers(snapshot.flowPointers)"), "Undo/redo restore must restore process pointers.");

for (const field of [
  "offsetX", "offsetY", "startOffsetX", "startOffsetY", "endOffsetX", "endOffsetY",
  "bendOffsetX", "bendOffsetY", "startInset", "endInset", "lineColor", "outlineColor",
  "lineWidth", "outlineWidth", "opacity", "lineStyle", "lineShape", "elbowDirection",
  "headStyle", "headSize",
]) {
  assert.ok(plant.includes(`data-flow-pointer-field="${field}"`), `Flow pointer field missing: ${field}`);
}
assert.ok(plant.includes('data-flow-pointer-check="visible"'), "Each process pointer needs independent visibility.");
assert.ok(plant.includes("flowPointerHandleAt(event)"), "Process arrows need direct canvas handle hit-testing.");
assert.ok(plant.includes('state.dragAction = `flow-pointer-${handle}`'), "Process pointer handles must enter their own drag mode.");
assert.ok(plant.includes('state.dragAction.startsWith("flow-pointer-")'), "Pointer drag updates must remain separate from machine movement.");
assert.ok(plant.includes('drawFlowPointerHandle([sx, sy], "S"'), "Start handle must render.");
assert.ok(plant.includes('drawFlowPointerHandle([ex, ey], "E"'), "End handle must render.");
assert.ok(plant.includes('drawFlowPointerHandle(midpoint, "M"'), "Whole-pointer move handle must render.");
assert.ok(plant.includes('drawFlowPointerHandle(bendPoint, "B"'), "Bend/control handle must render.");
assert.ok(plant.includes("traceFlowPointerPath"), "Straight, elbow, and curve pointer paths need a dedicated renderer.");
assert.ok(plant.includes("The production-process arrows are separate"), "Machine label help must distinguish label leaders from process arrows.");

assert.ok(plant.includes("function syncLayoutEditorViewport"), "Non-fullscreen editor must fit itself to the visible browser viewport.");
assert.ok(plant.includes('addLifecycleListener(window, "scroll", scheduleLayoutEditorViewportSync)'), "Editor viewport fit must respond to page scrolling.");
assert.ok(plant.includes('panel.style.height = `${height}px`'), "Editor viewport fit must constrain panel height.");
assert.ok(css.includes("overscroll-behavior: contain"), "Docked editor should keep scrolling inside the editor panel.");
assert.ok(css.includes(".flow-pointer-editor"), "Flow pointer editor needs dedicated styling.");

console.log("Flow pointer editor separation, dragging, persistence, and viewport-fit checks passed.");
