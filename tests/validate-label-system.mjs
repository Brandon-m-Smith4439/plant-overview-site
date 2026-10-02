import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plant = await readFile(new URL("../public/plant-app.js", import.meta.url), "utf8");

assert.ok(plant.includes('const WORLD_MACHINE_LABELS = true'), "World-space machine labels must be enabled for the v0.13.39 review.");
assert.ok(plant.includes('const SCREEN_SPACE_LABELS = false'), "Legacy 2D canvas labels must be disabled for the v0.13.39 review.");
assert.ok(plant.includes('todayLabelMode: "full"'), "Today must default to all full 3D machine labels while the 2D layer is disabled.");
assert.ok(
  plant.includes('data-label-display="necessary"') &&
  plant.includes('data-label-display="abbreviated"') &&
  plant.includes('data-label-display="full"'),
  "Today must expose Necessary, Abbreviated, and Full label modes."
);
assert.ok(!plant.includes('state.todayLabelMode = "necessary";\n      state.labelTextMode'), "Returning to Today must not erase the viewer's selected Today label mode.");
assert.ok(plant.includes('if (isTodayStage() && state.todayLabelMode === "necessary")'), "Necessary route labels must remain available on the Today stage in both overview and first person.");
assert.ok(plant.includes('drawTodayProductionFlow(machineEntries, time)'), "First person and overview must render the same Necessary flowing floor routes.");
assert.ok(plant.includes('if (SCREEN_SPACE_LABELS && (!isTodayStage() || isTodayOverview()))'), "Legacy normal machine-label rendering must remain behind the disabled screen-space gate.");
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
assert.ok(plant.includes("function drawProcessStepLabel"), "Necessary flow must render compact automatic numbered machine labels instead of relying on one route tag.");
assert.ok(plant.includes("PROCESS_STEP_NUMBER_BY_ROLE"), "Automatic process labels must use stable shared route-step numbers.");
assert.ok(plant.includes("labelRects.push(placement.padded)"), "Automatic process-step labels must reserve collision space separately from normal machine labels.");
assert.ok(plant.includes("collectProcessStepNodes(entriesById,routes).forEach((node)=>drawProcessStepLabel(node,protectedMachineRects))"), "Process-step labels must render in a stable pass after every glowing floor route.");
assert.ok(plant.includes('if (machine.type === "room") return /office|maintenance/.test(name);'), "Office and Maintenance rooms must be eligible for their construction-stage labels.");
assert.ok(plant.includes('const roomName = machine?.type === "room"'), "Room-stage labels must use full room names.");
assert.ok(plant.includes("labelTimelineAlpha > .15 && isStageEquipmentLabelCandidate"), "Construction stages must honor each machine label's independent reveal/retire window.");
assert.ok(plant.includes('data-label-field="labelReveal"') && plant.includes('data-label-field="labelRetire"'), "Layout label controls must expose independent appear/disappear stages.");
assert.ok(plant.includes("labelReveal: Number.isFinite") && plant.includes("labelRetire: Number.isFinite"), "Saved machines must normalize independent label timing.");
assert.ok(plant.includes('["reveal", "retire", "labelReveal", "labelRetire"]'), "Timeline stage reordering must keep label timing references aligned.");
assert.ok(plant.includes('return roomName || machineLabelText(machine);'), "Construction-stage labels must use complete machine/room names without truncation.");
assert.ok(plant.includes('return machineLabelText(machine);'), "Today Full mode must use complete machine names without truncation.");
assert.ok(plant.includes("function updateLabelVisualState") && plant.includes("labelTransitionsActive"), "Stage labels must still fade smoothly.");
assert.ok(plant.includes("labelWorldOffsetX") && plant.includes("labelWorldOffsetZ"), "Normal machine labels must store world-space placement offsets.");
assert.ok(plant.includes("project(labelWorldX, labelWorldY, labelWorldZ)"), "Normal machine labels must project a stable 3D world position.");
assert.ok(!plant.includes("const preferredSlot = clamp(Math.round(Number(previousVisual?.slot)"), "Normal machine labels must not search collision-driven 2D screen slots.");
assert.ok(plant.includes("visual.drawX = (targetRectangle.left + targetRectangle.right) / 2"), "World-anchored labels must follow their projected position directly.");
assert.ok(plant.includes("labelAnchorXPercent") && plant.includes("labelAnchorYPercent") && plant.includes("labelAnchorZPercent"), "Machine label anchors must remain editable.");
assert.ok(plant.includes("labelLineColor") && plant.includes("labelLineWidth") && plant.includes("labelLineOpacity"), "Each label leader needs independent color, width, and opacity.");
assert.ok(plant.includes("labelLineStyle") && plant.includes("labelLineShape") && plant.includes("labelLeaderSide"), "Each label leader needs independent line style, shape, and connection edge.");
assert.ok(plant.includes("labelTargetStyle") && plant.includes("labelTargetSize"), "Label pointer endpoint styling must remain independently adjustable.");
assert.ok(plant.includes('data-label-field="labelWorldOffsetX"') && plant.includes('data-label-field="labelWorldOffsetZ"'), "Labels editor must expose world-space X/Z positioning.");
assert.ok(plant.includes('data-label-field="labelPriority"') && plant.includes("Major equipment") && plant.includes("Support / cart / rack"), "Labels editor must expose label importance hierarchy.");
assert.ok(plant.includes("reset-label-world-position"), "Labels editor must provide a 3D position reset.");
assert.ok(plant.includes("labelScreenOffsetX") && plant.includes("labelScreenOffsetY"), "Legacy screen offsets must remain normalized for saved-layout compatibility.");
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


const threeRenderer = await readFile(new URL("../public/three-depth-scene-renderer.js", import.meta.url), "utf8");
assert.ok(threeRenderer.includes("function addWorldLabel"), "Three retained renderer must expose a true world-label primitive.");
assert.ok(threeRenderer.includes("depthTest: true") && threeRenderer.includes("u_viewProjection * modelMatrix"), "3D labels must participate in scene depth and world transforms.");
assert.ok(plant.includes("drawWorldMachineLabels(machineEntries, time);\n    presentPhysicalScene?.();"), "3D labels must be submitted before the physical WebGL frame is presented.");
assert.ok(plant.includes("if (!SCREEN_SPACE_LABELS || !state.showLabels"), "Legacy normal machine labels must stay off in comparison mode.");
assert.ok(plant.includes("if (!SCREEN_SPACE_LABELS) return;"), "Legacy process-step and route-tag canvas labels must stay off in comparison mode.");


const legacyLoader = await readFile(new URL("../app/legacy-script-loader.tsx", import.meta.url), "utf8");
const versionText = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
assert.ok(
  legacyLoader.includes(`const LEGACY_BUILD_TOKEN = "${versionText}";`),
  "LegacyScriptLoader cache-busting token must match VERSION so production cannot serve an older plant-app.js."
);
assert.ok(
  legacyLoader.includes('scriptUrl.searchParams.set("release", LEGACY_BUILD_TOKEN)'),
  "LegacyScriptLoader must append the release token to every legacy viewer script URL."
);


assert.ok(threeRenderer.includes("new THREE.BoxGeometry(1, 1, 1)"), "3D labels must have a real solid sign edge/backing.");
assert.ok(threeRenderer.includes("group.add(backing, front, back)"), "3D labels must contain distinct front and back readable faces.");
assert.ok(threeRenderer.includes("back.rotation.y = Math.PI"), "Back-side label text must be oriented for normal reading instead of mirrored.");
assert.ok(threeRenderer.includes("Orientation is intentionally independent from the camera"), "3D label rotation must be fixed in plant space instead of billboarding with camera yaw/pitch.");
assert.ok(!threeRenderer.includes("const yaw = Number(currentView?.yaw) || 0;\n      const pitch = Number(currentView?.pitch) || 0;\n      const cy = Math.cos(yaw);"), "World labels must not rotate to follow the camera.");
assert.ok(threeRenderer.includes("shadowBlur = 4 + glowStrength * .24"), "3D sign text must include configurable glow.");
assert.ok(threeRenderer.includes("Math.pow(zoomFactor, .22)") && threeRenderer.includes("zoomMinimum") && threeRenderer.includes("zoomMaximum"), "3D labels must scale gently with zoom and clamp that response.");
assert.ok(plant.includes('data-label-field="labelRotationY"') && plant.includes('data-label-field="labelDepthFeet"'), "Labels editor must expose fixed sign rotation and physical depth.");
assert.ok(plant.includes('data-label-field="labelGlowPercent"'), "Labels editor must expose text glow.");
assert.ok(plant.includes('data-label-field="labelZoomMinPercent"') && plant.includes('data-label-field="labelZoomMaxPercent"'), "Labels editor must expose zoom scaling limits.");
