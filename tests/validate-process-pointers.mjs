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
assert.ok(plant.includes("data-process-pointer-assignment"), "Pointers tab must let the editor bind a Necessary label to the selected machine.");
assert.ok(plant.includes('data-editor-action="remove-process-pointer"'), "Pointers tab must let the editor remove a Necessary pointer from the selected machine.");
assert.ok(plant.includes("assignProcessPointerToMachine"), "Necessary pointer assignment must use the explicit machine-binding helper.");
assert.ok(plant.includes("processPointersInitialized"), "Saved layouts must persist whether the one-time Necessary pointer migration has completed.");
assert.ok(plant.includes("processPointers: state.processPointers"), "Saved layouts must persist exact Necessary pointer bindings.");
assert.ok(plant.includes("processPointerAssignment.disabled = !machine"), "Pointer assignment must remain editable for the active machine inside a multi-object assembly.");
assert.ok(!plant.includes("processPointerAssignment.disabled = selectionCount !== 1"), "Pointer assignment must not be blocked solely because attached children are selected with the active machine.");
const updatePanelStart = plant.indexOf("function updateEditorPanel");
const updatePanelEnd = plant.indexOf("function updateEditorLiveTransformFields", updatePanelStart);
const updatePanelBody = plant.slice(updatePanelStart, updatePanelEnd);
assert.ok(!updatePanelBody.includes('input.addEventListener("change"'), "Inspector refresh must not register new change listeners repeatedly.");
const pointerHandlersStart = plant.indexOf('panel.querySelectorAll("[data-process-pointer-field]")', updatePanelEnd);
assert.ok(pointerHandlersStart > updatePanelEnd, "Process pointer handlers must be registered in the one-time editor setup path.");
assert.ok(plant.includes("if (!machine || !processPointerKeyForMachine(machine)) return;"), "Pointer geometry edits must follow the active assigned machine without requiring a single-object selection.");


const normalizeStart = plant.indexOf("function normalizeMachine");
const normalizeEnd = plant.indexOf("function defaultAnimationObjects", normalizeStart);
const normalizeBody = plant.slice(normalizeStart, normalizeEnd);
assert.ok(normalizeBody.includes("processPointerAnchorXPercent"), "Saved machines must normalize process pointer geometry.");
assert.ok(normalizeBody.includes("machine.labelAnchorXPercent"), "Existing label pointer geometry must migrate into the new process pointer fields.");

const nodeResolverStart = plant.indexOf("function buildTodayFlowNodes");
const nodeResolverEnd = plant.indexOf("function drawTodayFlowArrow", nodeResolverStart);
const nodeResolverBody = plant.slice(nodeResolverStart, nodeResolverEnd);
assert.ok(nodeResolverBody.includes("state.processPointers?.[definition.key]"), "Today flow must resolve each Necessary step from its saved machine instance binding.");
assert.ok(nodeResolverBody.includes("entriesById.get(instanceId)"), "Today flow must look up the exact rendered machine instance assigned to each Necessary step.");
assert.ok(!nodeResolverBody.includes("nearestFlowEntry") && !nodeResolverBody.includes("flowEntryPlanPoint") && !nodeResolverBody.includes("largest(groups"), "Today flow must not retarget Necessary labels by runtime position or proximity.");

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

assert.ok(css.includes("var(--editor-viewport-height"), "Layout editor height must be constrained by the real browser viewport.");
assert.ok(plant.includes("viewportTop + viewportHeight") && plant.includes("visibleBottom - visibleTop"), "Editor must compute remaining visible browser height from the actual visual viewport and rendered frame intersection.");
assert.ok(css.includes("grid-template-columns: repeat(5, minmax(0, 1fr))"), "Desktop object editor needs room for the new fifth tab.");
assert.ok(css.includes(".process-pointer-panel"), "Dedicated pointer controls need their own styling.");

assert.ok(plant.includes('scrollRegion.className = "editor-scroll-region"'), "Editor controls must live in a dedicated scroll region.");
assert.ok(plant.includes("panel.insertBefore(scrollRegion, closeBar)"), "Done editing footer must stay outside the scrolling controls.");
assert.ok(plant.includes("window.visualViewport"), "Editor height must use the browser visual viewport when available.");
assert.ok(css.includes("grid-template-rows: minmax(0, 1fr) auto"), "Editor shell must reserve a fixed row for the footer.");
assert.ok(css.includes(".editor-scroll-region") && css.includes("overflow-y: auto"), "Editor scroll region must scroll independently.");
const closeBarStart = css.indexOf(".editor-close-bar {");
const closeBarEnd = css.indexOf("}", closeBarStart);
const closeBarCss = css.slice(closeBarStart, closeBarEnd + 1);
assert.ok(closeBarStart >= 0 && !closeBarCss.includes("bottom: -18px") && closeBarCss.includes("position: relative"), "Editor footer must stay in its dedicated fixed row instead of being pushed below the scrollport.");

assert.ok(!css.includes("height: 100%;\n  overflow-y: auto;\n  touch-action: pan-y;"), "Inner editor scroll region must not force itself to 100% height above the footer row.");
const finalScrollFix = css.slice(css.lastIndexOf("v0.13.18"));
assert.ok(finalScrollFix.includes(".model-frame.editing .layout-editor"), "Final scroll fix must override the older docked-editor rule with matching specificity.");
assert.ok(finalScrollFix.includes("bottom: auto"), "Non-fullscreen editor must not stay simultaneously pinned to top and bottom when JavaScript supplies an explicit height.");
assert.ok(finalScrollFix.includes("grid-template-rows: minmax(0, 1fr) auto"), "Editor shell must reserve the remaining height for controls and a separate footer row.");
assert.ok(finalScrollFix.includes("height: auto") && finalScrollFix.includes("overflow-y: auto"), "Editor controls must use an auto-sized grid item with independent vertical scrolling.");
assert.ok(plant.includes("scrollRegion.scrollHeight - scrollRegion.clientHeight"), "Wheel scrolling must calculate the real available sidebar scroll range.");
assert.ok(plant.includes("scrollRegion.scrollTop = nextScrollTop"), "Wheel scrolling must explicitly advance the sidebar scroll position.");
assert.ok(plant.includes('{ passive: false }'), "Wheel fallback must be able to prevent scroll chaining after the sidebar consumes movement.");
assert.ok(plant.includes("visibleTop = Math.max(frameRect.top, viewportTop + 8)"), "Editor must anchor to the visible intersection of the model frame and browser viewport.");
assert.ok(plant.includes("panel.style.top") && plant.includes("panel.style.height") && plant.includes('panel.style.bottom = "auto"'), "Editor must receive explicit top and height values instead of relying on conflicting legacy top/bottom CSS.");
assert.ok(plant.includes('scrollRegion.tabIndex = 0') && plant.includes('aria-label", "Layout editor controls"'), "Scrollable controls should also be keyboard-focusable and accessible.");

console.log("Independent process-pointer editor and reliable sidebar scrolling checks passed.");
