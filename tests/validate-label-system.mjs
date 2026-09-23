import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plant = await readFile(new URL("../public/plant-app.js", import.meta.url), "utf8");

assert.ok(plant.includes('labelMode: "smart"'), "Smart collision handling must remain enabled.");
assert.ok(plant.includes('todayLabelMode: viewerPreferences.todayLabelMode'), "Today overview needs a persisted label mode.");
assert.ok(plant.includes('todayLabelMode: "necessary"'), "Necessary labels must be the default for new viewers.");
assert.ok(plant.includes('data-label-display="necessary"') && plant.includes('data-label-display="abbreviated"') && plant.includes('data-label-display="full"'), "Today must expose Necessary, Abbreviated, and Full label choices.");
assert.ok(!plant.includes('data-label-display="auto"') && !plant.includes('data-label-display="off"'), "Legacy Adaptive/Off choices must not crowd the Today label selector.");
assert.ok(plant.includes("function necessaryFlowLabel"), "Today overview needs a dedicated glass-flow label classifier.");
for (const label of ["Cutting", "Polisher", "Denver CNC", "Waterjet", "Washer", "Tempering Line", "Wrap", "Glass Truck", "Rack"]) {
  assert.ok(plant.includes(`text: "${label}"`), `Necessary flow label missing: ${label}`);
}
assert.ok(plant.includes('if (isTodayOverview()) return Number.POSITIVE_INFINITY;'), "Explicit Today label modes must not silently suppress requested labels.");
assert.ok(plant.includes('return 1;') && plant.includes('state.todayLabelMode === "necessary"'), "Necessary flow labels must deduplicate repeated machines.");
assert.ok(plant.includes("stageSpecificLabels") && plant.includes("current && isStageEquipmentLabelCandidate"), "Construction stages must show only equipment introduced in the current stage.");
assert.ok(plant.includes('const maximum = Math.max(24, Math.round(profile.maxChars * 2.2))'), "Construction-stage labels must use full-name text capacity.");
assert.ok(plant.includes('const priority = selected || (stageSpecificLabels && current);'), "Current-stage equipment must be prioritized so its labels remain visible.");
assert.ok(plant.includes("cssSize: compactLabelViewport() ? 7.2 : 8.4"), "Necessary flow labels must stay small and unobtrusive.");
assert.ok(plant.includes('fontWeight: flow ? "regular"'), "Necessary labels must use a lighter visual weight.");
assert.ok(plant.includes("machine.showLabel !== false || stageSpecificLabels || necessaryTodayLabels"), "Stage and Necessary modes must be able to show required labels even when an old per-object hide flag is present.");
assert.ok(plant.includes("PRIMARY_LABEL_TYPES") && plant.includes("SUPPORT_LABEL_TYPES") && plant.includes("MINOR_LABEL_TYPES"), "Labels must retain type-based sizing groups.");
assert.ok(plant.includes("function compactMachineLabel"), "Abbreviated labels need a dedicated shortening function.");
assert.ok(plant.includes("function smartLabelBudget"), "Labels need a viewport density budget.");
assert.ok(plant.includes("function smartLabelRepeatLimit"), "Repeated labels must be controlled.");
assert.ok(plant.includes("labelCandidates") && plant.includes("flowOrder"), "Necessary flow labels must be ranked in process order.");
assert.ok(plant.includes("function updateLabelVisualState") && plant.includes("labelTransitionsActive"), "Labels must fade smoothly between stages and modes.");
assert.ok(plant.includes("preferredSlot") && plant.includes("slotHoldUntil"), "Labels must retain stable collision slots.");
assert.ok(plant.includes("positionBlend") && plant.includes("visual.drawX"), "Label position changes must remain interpolated.");
assert.ok(plant.includes("labelAnchorXPercent") && plant.includes("labelAnchorYPercent") && plant.includes("labelAnchorZPercent") && plant.includes("labelHeightOffset"), "Machine label anchors must remain editable.");
assert.ok(plant.includes("labelAbbreviation") && plant.includes('data-label-field="labelAbbreviation"'), "Machines must retain editable abbreviations.");
assert.ok(plant.includes('ctx.strokeStyle = "rgba(9,18,21,.78)"') && plant.includes("Math.max(3.6, 3.2 * pixelScale)"), "Label pointers must remain high contrast.");
assert.ok(plant.includes("walkLabelDistance") && plant.includes("labelHorizon = 96"), "First-person labels must remain range limited.");
assert.ok(plant.includes('state.todayLabelMode === "full"'), "Full Today mode must retain the explicit full-name path.");
assert.ok(plant.includes('ctx.textAlign = "left"'), "Machine tags must remain easy to scan.");
assert.ok(plant.includes('const accent = selected ? "#f5b353"'), "Selected/current equipment must retain status accents.");

console.log("Stage-specific and Today glass-flow label regression checks passed.");
