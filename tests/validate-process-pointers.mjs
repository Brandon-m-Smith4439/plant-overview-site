import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plant = await readFile(path.join(root, "public", "plant-app.js"), "utf8");
const css = await readFile(path.join(root, "app", "globals.css"), "utf8");

assert.ok(plant.includes('data-object-editor-tab="pointers"'), "Object editor needs a dedicated Pointers tab.");
assert.ok(plant.includes('data-object-editor-panel="pointers"'), "Object editor needs a dedicated process-pointer panel.");
assert.ok(plant.includes('data-process-pointer-assignment'), "Pointers tab must assign machines to process nodes separately from connection geometry.");
assert.ok(plant.includes('data-process-node-field="processPointerText"'), "Process node text must remain separate from machine-label text.");
assert.ok(plant.includes('data-process-connection-select'), "Pointers tab must select an exact machine-to-machine connection.");
assert.ok(plant.includes('data-process-connection-target'), "Pointers tab must be able to add a connection to another process node.");
assert.ok(plant.includes('data-editor-action="add-process-connection"'), "Pointers tab must add process connections.");
assert.ok(plant.includes('data-editor-action="remove-process-connection"'), "Pointers tab must remove process connections.");
assert.ok(plant.includes('data-process-connection-check="visible"'), "Each machine-to-machine pointer must have independent visibility.");
for (const field of [
  "startAnchorXPercent", "startAnchorYPercent", "startAnchorZPercent",
  "endAnchorXPercent", "endAnchorYPercent", "endAnchorZPercent",
  "tagLift", "tagScreenOffsetX", "tagScreenOffsetY",
  "color", "width", "opacity", "style", "shape", "endStyle", "endSize",
]) {
  assert.ok(plant.includes(`data-process-connection-field="${field}"`), `Process connection field missing: ${field}`);
}
assert.ok(plant.includes('data-process-connection-check="tagVisible"'), "Route tags must be independently optional per connection.");

assert.ok(plant.includes("function defaultProcessConnection"), "Machine-to-machine pointers need their own connection data model.");
assert.ok(plant.includes("function normalizeProcessConnections"), "Saved process connections must be normalized independently from machines.");
assert.ok(plant.includes("processConnections: state.processConnections"), "Saved layouts must persist connection geometry separately from process-node assignments.");
assert.ok(plant.includes("processConnectionsInitialized: true"), "Connection migration must run only once for existing layouts.");
assert.ok(plant.includes("processConnections: initialProcessConnections"), "Runtime state must keep a dedicated processConnections collection.");
assert.ok(plant.includes('selectedProcessConnectionKey: ""'), "The editor needs an active connection independent from the active machine.");
assert.ok(plant.includes("legacyProcessConnectionFallback"), "Existing process-pointer settings should migrate once into independent connection geometry.");

const updatePanelStart = plant.indexOf("function updateEditorPanel");
const updatePanelEnd = plant.indexOf("function updateEditorLiveTransformFields", updatePanelStart);
const updatePanelBody = plant.slice(updatePanelStart, updatePanelEnd);
assert.ok(updatePanelBody.includes("selectedProcessConnection(machine)"), "Pointer panel must edit the selected connection edge, not a machine-label leader.");
assert.ok(updatePanelBody.includes("processConnectionDisplayName(activeConnection)"), "Pointer panel should clearly identify the exact connection being edited.");
assert.ok(!updatePanelBody.includes('input.addEventListener("change"'), "Inspector refresh must not register duplicate handlers.");

const handlerStart = plant.indexOf('panel.querySelectorAll("[data-process-connection-field]")', updatePanelEnd);
const handlerEnd = plant.indexOf(`panel.querySelector("[data-editor-action='refresh-labels']")`, handlerStart);
const handlerBody = plant.slice(handlerStart, handlerEnd);
assert.ok(handlerBody.includes("const connection = selectedProcessConnection()"), "Connection controls must modify the selected edge object.");
assert.ok(handlerBody.includes("connection[field] = clamp"), "Numeric pointer edits must write to connection geometry.");
assert.ok(plant.includes("delete state.processConnections[connection.key]"), "Removing a pointer must remove the machine-to-machine edge.");
assert.ok(plant.includes("state.processConnections[key] = defaultProcessConnection"), "Adding a pointer must create a new machine-to-machine edge.");
assert.ok(!handlerBody.includes("machine.labelAnchor"), "Process connection handlers must never edit machine-label anchors.");
assert.ok(!handlerBody.includes("machine.labelLine"), "Process connection handlers must never edit machine-label leader styling.");

const flowStart = plant.indexOf("function flowEntryWorldAnchor");
const flowEnd = plant.indexOf("function rectanglesIntersect", flowStart);
const flowBody = plant.slice(flowStart, flowEnd);
assert.ok(flowBody.includes("connection.startAnchorXPercent") || flowBody.includes('connection[`${prefix}AnchorXPercent`]'), "Renderer must use connection-owned start anchors.");
assert.ok(flowBody.includes("connection.color"), "Renderer must use connection-owned line color.");
assert.ok(flowBody.includes("connection.endStyle"), "Renderer must use connection-owned endpoint style.");
assert.ok(flowBody.includes("Object.values(state.processConnections || {})"), "Today flow must render the saved edge collection rather than a fixed line tied to machine fields.");
assert.ok(flowBody.includes("drawTodayFlowArrow(fromEntry, toEntry, connection)"), "Renderer must pass the edge object into the machine-to-machine arrow renderer.");
assert.ok(!flowBody.includes("machine.processPointerAnchorXPercent"), "Machine-to-machine rendering must no longer read process geometry from the machine record.");
assert.ok(!flowBody.includes("machine.labelAnchorXPercent"), "Machine-to-machine rendering must never read machine-label pointer geometry.");
assert.ok(!flowBody.includes("machine.labelLineColor"), "Machine-to-machine rendering must never read machine-label leader styling.");

const labelControlsStart = plant.indexOf('<fieldset class="label-controls">');
const labelControlsEnd = plant.indexOf('<fieldset class="crane-controls">', labelControlsStart);
const labelControls = plant.slice(labelControlsStart, labelControlsEnd);
assert.ok(labelControls.includes('data-label-field="labelAnchorXPercent"'), "Machine-label pointer must keep its own anchor controls.");
assert.ok(labelControls.includes('data-label-field="labelLineColor"'), "Machine-label pointer must keep its own leader style controls.");
assert.ok(!labelControls.includes("data-process-connection-field"), "Machine-label controls must not contain process connection geometry.");
assert.ok(plant.includes("Completely separate from machine labels"), "Pointers panel should explicitly explain the separation.");

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

console.log("Independent machine-to-machine process connection editor and reliable sidebar scrolling checks passed.");