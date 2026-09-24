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
assert.ok(plant.includes('if (isTodayOverview() && state.todayLabelMode === "necessary")'), "Necessary mode must use the dedicated production-flow overlay.");
assert.ok(plant.includes('else if (!isTodayStage() || isTodayOverview())'), "Full and Abbreviated Today modes must use normal machine-label rendering.");
assert.ok(plant.includes("function necessaryFlowLabel"), "Today needs a dedicated glass-flow classifier.");
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
assert.ok(plant.includes("function drawTodayFlowArrow"), "Today flow must render directional connectors.");
assert.ok(plant.includes('ctx.fillStyle = "#67c9bc"') && plant.includes("arrowSize"), "Flow connectors must include visible arrowheads.");
assert.ok(plant.includes("function drawTodayProductionFlow"), "Today flow must use its own overlay renderer.");
assert.ok(plant.includes('labelKey = `today-flow:${key}`'), "Flow labels need dedicated identities instead of normal machine-label identities.");
assert.ok(plant.includes('backgroundColor: "#0b1c1a"') && plant.includes('fontWeight: "regular"'), "Flow labels must use the compact special visual treatment.");
assert.ok(plant.includes('if (machine.type === "room") return /office|maintenance/.test(name);'), "Office and Maintenance rooms must be eligible for their construction-stage labels.");
assert.ok(plant.includes('const roomName = machine?.type === "room"'), "Room-stage labels must use full room names.");
assert.ok(plant.includes("stageSpecificLabels") && plant.includes("stageCurrent && isStageEquipmentLabelCandidate"), "Construction stages must label only equipment introduced in the selected stage.");
assert.ok(plant.includes('return roomName || machineLabelText(machine);'), "Construction-stage labels must use complete machine/room names without truncation.");
assert.ok(plant.includes('return machineLabelText(machine);'), "Today Full mode must use complete machine names without truncation.");
assert.ok(plant.includes("function updateLabelVisualState") && plant.includes("labelTransitionsActive"), "Stage labels must still fade smoothly.");
assert.ok(plant.includes("preferredSlot") && plant.includes("slotHoldUntil"), "Label collision placement must stay stable.");
assert.ok(plant.includes("positionBlend") && plant.includes("visual.drawX"), "Label movement must remain interpolated.");
assert.ok(plant.includes("labelAnchorXPercent") && plant.includes("labelAnchorYPercent") && plant.includes("labelAnchorZPercent"), "Machine label anchors must remain editable.");
assert.ok(plant.includes('ctx.strokeStyle = "rgba(9,18,21,.78)"'), "Stage-label leaders must retain their contrast outline.");
assert.ok(plant.includes('ctx.textAlign = "left"'), "Machine tags must remain easy to scan.");

console.log("Stage-specific and Today production-flow label regression checks passed.");
