import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plant = await readFile(new URL("../public/plant-app.js", import.meta.url), "utf8");

assert.ok(plant.includes('todayLabelMode: "necessary"'), "Today must default to the production-flow overlay.");
assert.ok(
  plant.includes('data-label-display="necessary"') &&
  plant.includes('data-label-display="abbreviated"') &&
  plant.includes('data-label-display="full"'),
  "Today must expose Necessary, Abbreviated, and Full label modes."
);
assert.ok(!plant.includes('state.todayLabelMode = "necessary";\n      state.labelTextMode'), "Returning to Today must not erase the viewer's selected Today label mode.");
assert.ok(plant.includes('if (isTodayStage() && state.todayLabelMode === "necessary")'), "Necessary route labels must remain available on the Today stage in both overview and first person.");
assert.ok(plant.includes('drawTodayProductionFlow(machineEntries, time)'), "First person and overview must render the same Necessary flowing floor routes.");
assert.ok(plant.includes('if (!isTodayStage() || isTodayOverview())'), "Today must run normal machine-label rendering even when the process overlay is enabled.");
assert.ok(plant.includes("function necessaryFlowLabel"), "Today needs a dedicated glass-flow classifier.");
assert.ok(plant.includes("PROCESS_POINTER_FLOW_DEFINITIONS"), "Necessary production-flow labels must use stable flow definitions.");
for (const label of ["Cutting", "Polisher", "Denver CNC", "Waterjet", "Washer", "Tempering Line", "Wrap", "Glass Truck", "Rack"]) {
  assert.ok(plant.includes(`text: "${label}"`), `Production-flow label missing: ${label}`);
}
assert.ok(plant.includes("const TODAY_FLOW_LINKS"), "Today needs an explicit process-flow graph.");
for (const edge of [
  '["cutting", "polisher"]',
  '["polisher", "denver-cnc"]',
  '["polisher", "waterjet"]',
  '["denver-cnc", "washer"]',
  '["waterjet", "washer"]',
  '["washer", "tempering"]',
  '["tempering", "wrap"]',
  '["wrap", "glass-truck"]',
  '["wrap", "rack"]',
]) assert.ok(plant.includes(edge), `Missing flow edge ${edge}`);
assert.ok(plant.includes("function drawFloorProcessFlow"), "Today flow must render animated glowing floor routes.");
assert.ok((plant.includes("lineDashOffset=-dashTravel") || plant.includes("lineDashOffset = -dashTravel")) && plant.includes("ctx.shadowBlur"), "Flow routes must include visible glowing directional motion.");
assert.ok(plant.includes("function drawTodayProductionFlow"), "Today flow must use its own overlay renderer.");
assert.ok(plant.includes("function drawProcessRouteTag"), "Process pointers must render a dedicated route tag instead of reusing the normal machine-label renderer.");
assert.ok(plant.includes("labelRects.push(paddedLabelRectangle(box"), "Process route tags must reserve screen space separately from machine labels.");
assert.ok(plant.includes("routeTags.forEach"), "Route tags must render after every glowing floor route so a later route cannot draw over an earlier tag.");
assert.ok(plant.includes('if (machine.type === "room") return /office|maintenance/.test(name);'), "Office and Maintenance rooms must be eligible for their construction-stage labels.");
assert.ok(plant.includes('const roomName = machine?.type === "room"'), "Room-stage labels must use full room names.");
assert.ok(plant.includes("labelTimelineAlpha > .15 && isStageEquipmentLabelCandidate"), "Construction stages must honor each machine label's independent reveal/retire window.");
assert.ok(plant.includes('data-label-field="labelReveal"') && plant.includes('data-label-field="labelRetire"'), "Layout label controls must expose independent appear/disappear stages.");
assert.ok(plant.includes("labelReveal: Number.isFinite") && plant.includes("labelRetire: Number.isFinite"), "Saved machines must normalize independent label timing.");
assert.ok(plant.includes('["reveal", "retire", "labelReveal", "labelRetire"]'), "Timeline stage reordering must keep label timing references aligned.");
assert.ok(plant.includes('return roomName || machineLabelText(machine);'), "Construction-stage labels must use complete machine/room names without truncation.");
assert.ok(plant.includes('return machineLabelText(machine);'), "Today Full mode must use complete machine names without truncation.");
assert.ok(plant.includes("function updateLabelVisualState") && plant.includes("labelTransitionsActive"), "Stage labels must still fade smoothly.");
assert.ok(plant.includes("preferredSlot") && plant.includes("slotHoldUntil"), "Label collision placement must stay stable.");
assert.ok(plant.includes("positionBlend") && plant.includes("visual.drawX"), "Label movement must remain interpolated.");
assert.ok(plant.includes("labelAnchorXPercent") && plant.includes("labelAnchorYPercent") && plant.includes("labelAnchorZPercent"), "Machine label anchors must remain editable.");
assert.ok(plant.includes("labelLineColor") && plant.includes("labelLineWidth") && plant.includes("labelLineOpacity"), "Each label leader needs independent color, width, and opacity.");
assert.ok(plant.includes("labelLineStyle") && plant.includes("labelLineShape") && plant.includes("labelLeaderSide"), "Each label leader needs independent line style, shape, and connection edge.");
assert.ok(plant.includes("labelTargetStyle") && plant.includes("labelTargetSize") && plant.includes("labelScreenOffsetX") && plant.includes("labelScreenOffsetY"), "Label pointer endpoint and tag position must be independently adjustable.");
assert.ok(plant.includes("function labelLeaderConnection") && plant.includes("function traceLabelLeader"), "The label renderer must support editable connection geometry.");
assert.ok(plant.includes("function processPointerFlowLabel") && plant.includes("processPointerText"), "Process-flow labels must use their own processPointerText instead of machine label text.");
assert.ok(plant.includes("const text = displayMachineLabel(entry.machine, profile)"), "Necessary Today mode must still render the normal machine label as a separate layer.");
assert.ok(plant.includes("const flow = necessaryTodayLabels ? assignedProcessFlowForMachine(entry.machine) : null"), "Necessary Today machine-label filtering must use explicit process assignments without replacing machine label text.");
assert.ok(plant.includes('data-object-editor-tab="labels"') && plant.includes('data-object-editor-panel="labels"'), "Plant editor must expose a dedicated Labels tab.");
assert.ok(plant.includes('data-label-check="labelShowToday"'), "Labels tab must expose a normal Today Overview visibility checkbox.");
assert.ok(plant.includes("Show this machine/object label in Necessary mode"), "Today Necessary-mode label visibility must be clearly labeled near the top of the Labels tab.");
assert.ok(plant.includes("labelShowToday: machine.labelShowToday === true"), "Saved machines must normalize explicit Today label visibility.");
assert.ok(plant.includes("eligible = entry.machine.labelShowToday === true;"), "Necessary Today normal machine labels must obey only their explicit Today visibility toggle.");
assert.ok(!plant.includes("Boolean(flow) || entry.machine.labelShowToday === true"), "A process-flow assignment must not force a normal machine label visible in Necessary mode.");
assert.ok(!plant.includes("Boolean(flow) || machine.labelShowToday === true"), "Necessary Today mode must not reference an undefined machine variable, which aborts the render loop before the 3D scene is presented.");
assert.ok(plant.includes("function drawSceneObjects(time, presentPhysicalScene = null)"), "Plant scene drawing must expose a physical-scene presentation boundary before 2D overlays.");
const sceneDrawBody = plant.slice(plant.indexOf("function drawSceneObjects(time, presentPhysicalScene = null)"), plant.indexOf("function drawDesignTextLabels"));
assert.ok(sceneDrawBody.indexOf("presentPhysicalScene?.()") < sceneDrawBody.indexOf("drawTodayProductionFlow(machineEntries"), "Necessary-mode pointers and labels must be drawn only after the physical 3D scene is presented.");
assert.ok(plant.includes('ctx.textAlign = "left"'), "Machine tags must remain easy to scan.");

console.log("Stage-specific and Today production-flow label regression checks passed.");
