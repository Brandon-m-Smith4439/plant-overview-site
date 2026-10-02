import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plant = await readFile(new URL("../public/plant-app.js", import.meta.url), "utf8");

for (const field of ["flowCurvePercent", "flowFloorHeight", "flowSpeed", "flowGlow"]) {
  assert.ok(plant.includes(field), `Flow-route field missing: ${field}`);
  assert.ok(plant.includes(`data-process-connection-field="${field}"`), `Flow-route editor control missing: ${field}`);
}
assert.ok(plant.includes("flowPivotPoints") && plant.includes("flowPivotMode"), "Floor routes must persist an arbitrary exact pivot list.");
assert.ok(plant.includes('data-process-pivot-field="x"') && plant.includes('data-process-pivot-field="z"'), "Pivot editor must expose exact X/Z coordinate controls.");

assert.ok(plant.includes("function processFlowFloorAnchor"), "Flow routes must lock their visible path to the floor plane.");
assert.ok(plant.includes("function processFlowControlPoints") && plant.includes("normalizeProcessFlowPivotPoints"), "Flow routes must expose editable arbitrary exact pivot geometry.");
assert.ok(plant.includes("function roundedProcessFlowPath"), "Flow routes must support rounded/arched corners.");
assert.ok(plant.includes("function drawFloorProcessFlow"), "Necessary process routes must use the animated floor-flow renderer.");
assert.ok(plant.includes("lineDashOffset=-dashTravel") || plant.includes("lineDashOffset = -dashTravel"), "Floor routes need a moving directional highlight.");
assert.ok(plant.includes("ctx.shadowColor=route.color") || plant.includes("ctx.shadowColor = route.color"), "Floor routes need a visible glow treatment.");
assert.ok(plant.includes("drawProcessFlowEditHandles") && plant.includes('drawProcessFlowHandle(route.startWorld,"S"') && plant.includes('drawProcessFlowHandle(route.endWorld,"E"'), "Selected routes must show S/E endpoint handles plus the intermediate turn handles.");
assert.ok(plant.includes('if (isTodayStage() && state.todayLabelMode === "necessary")'), "Necessary floor routes must run on the Today stage.");
assert.ok(plant.includes("drawTodayProductionFlow(machineEntries, time)"), "Overview and First Person must render the same floor-flow route system.");
assert.ok(!plant.includes('labelsOnly: state.cameraMode === "walk"'), "First Person must not suppress the glowing floor paths.");
assert.ok(plant.includes("processFlowAnimationActive()"), "Moving floor routes must keep the render loop active.");
assert.ok(plant.includes("effectiveAnimationTime(time)"), "Flow animation must obey the global Pause Motion clock.");
assert.ok(plant.includes("collectProcessStepNodes(entriesById,routes).forEach(drawProcessStepLabel)"), "Automatic process-step labels must render after the glowing floor paths.");
assert.ok(plant.includes("PROCESS_STEP_NUMBER_BY_ROLE"), "Standard process roles must map to stable numbered route steps.");
assert.ok(plant.includes("function drawProcessStepLabel"), "Each process number must receive an adaptive machine-name label.");
assert.ok(plant.includes("protectedMachineRects") && plant.includes("protectedRects.some((machineRect)=>rectanglesIntersect(padded,machineRect))"), "Process-step labels must avoid projected machine rectangles instead of covering equipment.");
assert.ok(plant.includes("protectedMachineRects.filter(Boolean)"), "Process-step labels must use the shared protected-machine set during collision placement.");
assert.ok(plant.includes("projectedPixelSpan(node.entry.rendered)"), "Process-step label sizing must respond to projected overview scale.");
assert.ok(plant.includes("!labelRects.some((used)=>rectanglesIntersect(padded,used))"), "Process-step labels must avoid one another using the shared label collision map.");
assert.ok(plant.includes("processStepMachineRect"), "Process-step labels must avoid covering their associated machine in overview mode.");
assert.ok(plant.includes("buildTodayProcessObjectEntries(machineEntries,time)"), "Process routes must rebuild endpoint entries independently of current camera culling.");

console.log("Animated glowing floor-flow route validation passed.");
