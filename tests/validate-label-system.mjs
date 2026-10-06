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
assert.ok(plant.includes('const todayProductionFlow = isTodayStage() ? drawTodayProductionFlow(machineEntries, time) : null;'), "Today must automatically submit the process route regardless of label mode.");
assert.ok(!plant.includes('if (isTodayStage() && state.todayLabelMode === "necessary") {\n      drawTodayProductionFlow'), "Today route visibility must not depend on Necessary label mode.");
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
assert.ok(plant.includes("function addWorldRouteRibbon") && plant.includes("speedFeetPerSecond"), "Flow routes must animate in world space with camera-independent speed.");
assert.ok(plant.includes('depthRenderer.addPolygon(polygon,color,alpha,null,1,{transparent:true})'), "Flow routes must be submitted to the depth-tested WebGL renderer.");
assert.ok(plant.includes("function drawTodayProductionFlow") && plant.includes("function drawTodayProductionFlowOverlay"), "Today flow must separate the physical world pass from edit overlays.");
assert.ok(plant.includes("function drawProcessStepLabel"), "Necessary flow must render compact automatic numbered machine labels instead of relying on one route tag.");
assert.ok(plant.includes("PROCESS_STEP_NUMBER_BY_ROLE"), "Automatic process labels must use stable shared route-step numbers.");
assert.ok(plant.includes("labelRects.push(placement.padded)"), "Automatic process-step labels must reserve collision space separately from normal machine labels.");
assert.ok(plant.includes("collectProcessStepNodes(entriesById,routes).forEach((node)=>drawProcessStepLabel(node,protectedMachineRects))"), "Process-step labels must render in a stable pass after every glowing floor route.");
assert.ok(plant.includes('if (machine.type === "room") return /office|maintenance/.test(name);'), "Office and Maintenance rooms must be eligible for their construction-stage labels.");
assert.ok(plant.includes('const roomName = machine?.type === "room"'), "Room-stage labels must use full room names.");
assert.ok(plant.includes("labelTimelineAlpha > .15 && isStageEquipmentLabelCandidate"), "Construction stages must honor each machine label's independent reveal/retire window.");
assert.ok(!plant.includes('Label appears at<select data-label-field="labelReveal"') && !plant.includes('Label disappears after<select data-label-field="labelRetire"'), "The active 3D label panel must not expose retired screen-space timing controls.");
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
assert.ok(!plant.includes('World X offset (ft)') && !plant.includes('World Z offset (ft)'), "The active label panel must not duplicate position with legacy world-offset controls.");
assert.ok(!plant.includes('Importance<select data-label-field="labelPriority"'), "The active physical label editor must not expose the legacy importance control.");
assert.ok(plant.includes("reset-label-world-position"), "Labels editor must provide a 3D position reset.");
assert.ok(plant.includes("labelScreenOffsetX") && plant.includes("labelScreenOffsetY"), "Legacy screen offsets must remain normalized for saved-layout compatibility.");
assert.ok(plant.includes("function labelLeaderConnection") && plant.includes("function traceLabelLeader"), "The label renderer must support editable connection geometry.");
assert.ok(plant.includes("function processPointerFlowLabel") && plant.includes("processPointerText"), "Process-flow labels must use their own processPointerText instead of machine label text.");
assert.ok(plant.includes("const text = displayMachineLabel(entry.machine, profile)"), "Necessary Today mode must still render the normal machine label as a separate layer.");
assert.ok(plant.includes("const flow = necessaryTodayLabels ? assignedProcessFlowForMachine(entry.machine) : null"), "Necessary Today machine-label filtering must use explicit process assignments without replacing machine label text.");
assert.ok(plant.includes('data-object-editor-tab="labels"') && plant.includes('data-object-editor-panel="labels"'), "Plant editor must expose a dedicated Labels tab.");
assert.ok(plant.includes('data-label-check="labelShowToday"'), "Labels tab must expose a normal Today Overview visibility checkbox.");
assert.ok(plant.includes("Show in Today Overview · Necessary labels"), "Today Necessary-mode label visibility must remain clear in the simplified Labels tab.");
assert.ok(plant.includes("labelShowToday: machine.labelShowToday === true"), "Saved machines must normalize explicit Today label visibility.");
assert.ok(plant.includes("eligible = entry.machine.labelShowToday === true;"), "Necessary Today normal machine labels must obey only their explicit Today visibility toggle.");
assert.ok(!plant.includes("Boolean(flow) || entry.machine.labelShowToday === true"), "A process-flow assignment must not force a normal machine label visible in Necessary mode.");
assert.ok(!plant.includes("Boolean(flow) || machine.labelShowToday === true"), "Necessary Today mode must not reference an undefined machine variable, which aborts the render loop before the 3D scene is presented.");
assert.ok(plant.includes("function drawSceneObjects(time, presentPhysicalScene = null)"), "Plant scene drawing must expose a physical-scene presentation boundary before 2D overlays.");
const sceneDrawBody = plant.slice(plant.indexOf("function drawSceneObjects(time, presentPhysicalScene = null)"), plant.indexOf("function drawDesignTextLabels"));
assert.ok(sceneDrawBody.indexOf("drawTodayProductionFlow(machineEntries") < sceneDrawBody.indexOf("presentPhysicalScene?.()"), "Physical Today route geometry must be submitted before the 3D scene is presented.");
assert.ok(sceneDrawBody.indexOf("presentPhysicalScene?.()") < sceneDrawBody.indexOf("drawTodayProductionFlowOverlay(todayProductionFlow)"), "Only route edit overlays may draw after physical scene presentation.");
assert.ok(plant.includes('ctx.textAlign = "left"'), "Machine tags must remain easy to scan.");

console.log("Stage-specific and Today production-flow label regression checks passed.");


const threeRenderer = await readFile(new URL("../public/three-depth-scene-renderer.js", import.meta.url), "utf8");
assert.ok(threeRenderer.includes("function addWorldLabel"), "Three retained renderer must expose a true world-label primitive.");
assert.ok(threeRenderer.includes("depthTest: true") && threeRenderer.includes("u_viewProjection * modelMatrix"), "3D labels must participate in scene depth and world transforms.");
const worldLabelSubmit = plant.indexOf("drawWorldMachineLabels(machineEntries, time);");
const physicalPresent = plant.indexOf("presentPhysicalScene?.();", worldLabelSubmit);
assert.ok(worldLabelSubmit >= 0 && physicalPresent > worldLabelSubmit, "3D labels must be submitted before the physical WebGL frame is presented.");
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
assert.ok(threeRenderer.includes("group.add(backing, front, back, frontText, backText)"), "3D labels must contain distinct front/back faces plus raised front/back text meshes.");
assert.ok(threeRenderer.includes("back.rotation.y = Math.PI"), "Back-side label text must be oriented for normal reading instead of mirrored.");
assert.ok(threeRenderer.includes("Labels remain planted at one world position"), "3D billboards must keep a stable world position while their yaw follows the camera.");
assert.ok(threeRenderer.includes("const cameraYaw = Number(currentView?.yaw) || 0;"), "3D billboards must derive their slow yaw target from camera heading.");
assert.ok(!threeRenderer.includes("const pitch = Number(currentView?.pitch) || 0;\n      const cy = Math.cos(yaw);"), "3D billboards must not snap through full yaw/pitch billboarding.");
assert.ok(threeRenderer.includes("shadowBlur = 3 + glowStrength * .16"), "3D sign text must include restrained configurable glow.");
assert.ok(threeRenderer.includes("Math.pow(zoomFactor, .22)") && threeRenderer.includes("zoomMinimum") && threeRenderer.includes("zoomMaximum"), "3D labels must scale gently with zoom and clamp that response.");
assert.ok(plant.includes('data-label-field="labelRotationY"') && plant.includes('data-label-field="labelDepthFeet"'), "Labels editor must expose fixed sign rotation and physical depth.");
assert.ok(plant.includes('data-label-field="labelGlowPercent"'), "Labels editor must expose text glow.");
assert.ok(plant.includes('data-label-field="labelZoomMinPercent"') && plant.includes('data-label-field="labelZoomMaxPercent"'), "Labels editor must expose zoom scaling limits.");


assert.ok(
  threeRenderer.includes("instanceBatches.forEach((entry) => { entry.used = false; entry.mesh.visible = false; });"),
  "Retained instance batches must hide their mesh at beginFrame; referencing a nonexistent group freezes camera, zoom, and stage redraws."
);
assert.ok(
  !threeRenderer.includes("instanceBatches.forEach((entry) => { entry.used = false; entry.group.visible = false; });"),
  "Retained instance batches must never reference entry.group because instance batch entries only own entry.mesh."
);
assert.ok(
  threeRenderer.includes("if (entry?.faceMaterial) entry.faceMaterial.uniformsNeedUpdate = true;") &&
  threeRenderer.includes("if (entry?.edgeMaterial) entry.edgeMaterial.uniformsNeedUpdate = true;"),
  "World-label shader materials must refresh their shared view-projection uniforms when the camera moves."
);


assert.ok(plant.includes('<option value="cutting">Barefoot cutting tables</option>'), "Cutting tables must be addable again from Standard machines.");
assert.ok(plant.includes('<option value="filtration">Waterjet pump & filtration</option>'), "Waterjet filtration must be addable from Standard machines.");
for (const type of ["cutting","waterjet","filtration","kodiak","denver","washer","furnace","cube","wrapping","shipping","aFrame","aFrameTruck","craneMachine","bridgeCrane","glassRack","room","person"]) {
  assert.ok(plant.includes(`<option value="${type}"`), `Standard Add panel is missing built-in type: ${type}`);
}
assert.ok(plant.includes('labelTurnToCamera: machine.labelTurnToCamera !== false'), "3D labels must persist slow camera-follow behavior.");
assert.ok(plant.includes('data-label-field="labelTurnSpeedPercent"'), "3D label settings must expose camera follow speed.");
assert.ok(plant.includes('data-label-check="labelTurnToCamera"'), "3D label settings must expose the slow-follow toggle.");
assert.ok(threeRenderer.includes("wrapHalfTurn") && threeRenderer.includes("errorRatio") && threeRenderer.includes("maxSpeed"), "3D label yaw must use damped dynamic camera following.");
assert.ok(threeRenderer.includes('context.createLinearGradient') && threeRenderer.includes('context.shadowColor = borderColor'), "3D billboard face should include polished depth/highlight styling.");


assert.ok(plant.includes("for(let start=phase-period;start<metrics.total;start+=period)"), "World-route white highlights must travel from source toward destination.");
assert.ok(threeRenderer.includes('WORLD_LABEL_FACE_REVISION = "v0.13.47-extruded-text"'), "3D labels must use the v0.13.47 extruded-text face revision.");
assert.ok(threeRenderer.includes('roundedRect(context, 20, 27, 5, height - 54, 2.5)') && !threeRenderer.includes('context.arc(46, 67, 15'), "3D labels must use the restrained single accent rail without the previous busy beacon/status treatment.");
assert.ok(threeRenderer.includes('const edge = parseColor(options.backgroundColor || "#132126", 1);'), "3D label physical sides must use the dark background color instead of the bright accent color.");


assert.ok(plant.includes('flowFloorHeight: readNumber("flowFloorHeight", 0.02, 30)'), "Process route Y height must persist up to 30 ft.");
assert.ok(plant.includes('function worldRouteSegmentPrismFaces') && plant.includes('function addWorldRoutePrism'), "Raised process routes must gain real 3D prism geometry.");
assert.ok(plant.includes('const elevationFactor=clamp((routeY-.26)/1.05,0,1);'), "Route 3D thickness must increase progressively as Route Y rises.");
assert.ok(plant.includes('addWorldRoutePrism(slice') && plant.includes('routeThickness/2+highlightThickness/2+.012'), "Moving white route highlights must ride on top of elevated 3D rails.");
assert.ok(threeRenderer.includes('function createWorldLabelTextTexture'), "Billboard text must render on a separate texture plane.");
assert.ok(threeRenderer.includes('frontText') && threeRenderer.includes('backText'), "Billboard text must have raised front and rear meshes.");
assert.ok(threeRenderer.includes('const textExtrude = clamp(Number(options.textExtrudeFeet) || .065'), "3D billboard text must physically protrude from the sign face.");
assert.ok(threeRenderer.includes('entry.frontText.position.set(0, 0, textOffset)') && threeRenderer.includes('entry.backText.position.set(0, 0, -textOffset)'), "Raised label text must sit in front of both readable faces.");


assert.ok(plant.includes("flowFloorHeight: [0.02, 30]"), "Route Y editor must allow elevated routes up to 30 ft.");
assert.ok(plant.includes("function addWorldRoutePrism") && plant.includes("elevationFactor=clamp((routeY-.26)/1.05,0,1)"), "Elevated process routes must progressively become physical 3D rails.");
assert.ok(plant.includes("labelTextExtrudeFeet: clamp("), "Machine labels must persist raised text depth.");
assert.ok(plant.includes('data-label-field="labelTextExtrudeFeet"'), "Labels editor must expose raised text depth.");
assert.ok(plant.includes("textExtrudeFeet: clamp(Number(machine.labelTextExtrudeFeet"), "Raised text depth must reach the WebGL billboard renderer.");
assert.ok(threeRenderer.includes("const textExtrude = clamp(Number(options.textExtrudeFeet) || .065, .02, .3);"), "Billboard text must have configurable physical offset from the sign face.");
assert.ok(plant.includes("const VISUAL_COLOR_PRESETS = {") && plant.includes('"plant-teal"') && plant.includes('"glass-blue"') && plant.includes('"process-green"'), "Shared color presets must include a consistent plant palette.");
assert.ok(plant.includes("data-label-color-picker") && plant.includes("data-process-color-preset"), "3D labels must use the integrated palette while process routes keep their preset selector.");
assert.ok(plant.includes("matchingLabelColorPreset") && plant.includes("matchingProcessColorPreset"), "Preset controls must reflect the current custom/preset color state.");


assert.ok(plant.includes('data-label-color-picker') && plant.includes('data-label-color-swatch="plant-teal"'), "Machine label colors must use the integrated custom/preset picker.");
assert.ok(!plant.includes('data-label-color-preset data-needs-selection'), "Machine labels must not use a separate color preset dropdown.");
assert.ok(plant.includes('data-label-field="labelAnchorXPercent" data-needs-selection min="-1000" max="1100"'), "Machine label X placement must extend outside machine bounds.");
assert.ok(plant.includes('machine[field] = clamp(value, -1000, 1100)'), "Machine label anchor edits must persist the extended range.");
assert.ok(plant.includes('const leaderAnchor = localPoint('), "Out-of-bounds labels must keep their leader attached to the machine surface.");
assert.ok(plant.includes('machine.labelSizePercent = Math.max(5, Number(input.value) || 100);'), "Machine label size must no longer have a 250 percent ceiling.");
assert.ok(plant.includes('const labelHeight = Math.max(.25, baseHeight * sizeMultiplier);'), "World-space billboard size must not retain the old 8 ft cap.");
assert.ok(!plant.includes('Label appears at<select data-label-field="labelReveal"'), "Obsolete screen-space label timing controls must be removed from the active label panel.");
