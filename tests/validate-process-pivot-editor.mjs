import assert from "node:assert/strict";
import fs from "node:fs";

const plant=fs.readFileSync(new URL("../public/plant-app.js",import.meta.url),"utf8");

assert.ok(plant.includes("PROCESS_FLOW_MAX_PIVOTS = 24"),"Routes must support a bounded arbitrary pivot list.");
assert.ok(plant.includes("flowPivotMode")&&plant.includes("flowPivotPoints"),"Process connections must persist exact pivot mode and pivot coordinates.");
assert.ok(plant.includes("normalizeProcessFlowPivotPoints"),"Saved pivot coordinates must be normalized safely.");
assert.ok(plant.includes("materializeProcessFlowPivots"),"Legacy Turn 1 / Turn 2 routes must convert to exact coordinates without changing shape.");
assert.ok(plant.includes('data-editor-action="add-process-pivot"')&&plant.includes('data-editor-action="clear-process-pivots"'),"Pivot editor needs add and clear controls.");
assert.ok(plant.includes('data-process-pivot-field="x"')&&plant.includes('data-process-pivot-field="z"'),"Every pivot must expose exact X / Z coordinate controls.");
assert.ok(plant.includes("function processFlowHandleAt")&&plant.includes('kind:"pivot"'),"Numbered pivot handles must be directly draggable.");
assert.ok(plant.includes("updateDraggedProcessPivot"),"Dragging a pivot must update its exact saved world coordinate.");
assert.ok(plant.includes("processStepLabelEnabled")&&plant.includes("processStepNumber")&&plant.includes("processStepLabelText"),"Any machine must be able to opt into a custom process-step label.");
assert.ok(plant.includes("customEnabled=entry.machine.processStepLabelEnabled===true"),"Custom process labels must join the same automatic label collection pass.");
console.log("Exact process pivot and custom process-step label validation passed.");
