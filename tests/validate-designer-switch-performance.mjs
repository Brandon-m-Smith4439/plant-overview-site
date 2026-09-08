import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");

const selectStart = source.indexOf("function selectDesign(id)");
const selectEnd = source.indexOf("function selectComponent(", selectStart);
const selectDesign = source.slice(selectStart, selectEnd);
assert.ok(selectStart >= 0 && selectEnd > selectStart, "Machine selection implementation is missing.");
assert.match(selectDesign, /id === state\.designId/, "Selecting the active machine must be a no-op.");
assert.match(selectDesign, /renderPerformance\.invalidate\?\.\("design-switch"\)/, "Machine switching must invalidate the on-demand viewport immediately.");
assert.match(selectDesign, /querySelectorAll\("\[data-design-id\]"\)/, "Machine switching must check whether the destination already has a library row.");
assert.match(selectDesign, /button\.dataset\.designId === id/, "The list reuse check must target the newly selected machine.");
assert.match(selectDesign, /updateInterface\(\{ designSwitch: canReuseDesignList \}\)/, "Existing machines must keep the fast path while new Save As machines rebuild the list immediately.");
assert.ok(!selectDesign.includes("syncLinkedMachineToCurrentDesign();"), "Plant-layout serialization must not block the visible machine switch.");

const saveAsStart = source.indexOf("function saveDesignAs(");
const saveAsEnd = source.indexOf("function duplicateDesign()", saveAsStart);
const saveDesignAs = source.slice(saveAsStart, saveAsEnd);
assert.ok(saveAsStart >= 0 && saveAsEnd > saveAsStart, "Save As implementation is missing.");
assert.match(saveDesignAs, /library\[id\] = normalizeDesign/, "Save As must add the copy to the reusable machine library.");
assert.match(saveDesignAs, /saveLibrary\(\);[\s\S]*?selectDesign\(id\);/, "Save As must persist and select the new machine so the list-refresh check runs immediately.");

const listSelectionStart = source.indexOf("function updateDesignListSelection()");
const listSelectionEnd = source.indexOf("function envelopePointsForComponent", listSelectionStart);
const listSelection = source.slice(listSelectionStart, listSelectionEnd);
assert.match(listSelection, /classList\.toggle\("active"/, "The fast path must reuse the existing machine list.");
assert.ok(!listSelection.includes("innerHTML"), "Machine switching must not rebuild the complete machine list.");

const interfaceStart = source.indexOf("function updateInterface({ designSwitch = false } = {})");
const interfaceEnd = source.indexOf("function selectionBounds", interfaceStart);
const updateInterface = source.slice(interfaceStart, interfaceEnd);
assert.match(updateInterface, /if \(!designSwitch\) updateEmbeddedMachinePicker\(\)/, "The hidden embedded-machine picker must stay out of the blocking switch path.");
assert.match(updateInterface, /updateDesignFields\(\{ includeEnvelope: !designSwitch \}\)/, "Expensive envelope geometry must be deferred while switching.");
assert.match(updateInterface, /if \(!designSwitch\) updateAnimationTimelineUI\(\)/, "The full timeline must stay out of the blocking switch path.");
assert.match(updateInterface, /if \(!designSwitch\) updateAssignmentPanel\(\)/, "Plant assignment controls must stay out of the blocking switch path.");
assert.match(updateInterface, /scheduleDesignSwitchPanelRefresh\(\)/, "Deferred panels must still refresh after the visible switch.");

const deferredStart = source.indexOf("function scheduleDesignSwitchPanelRefresh()");
const deferredEnd = source.indexOf("function updateInterface", deferredStart);
const deferredRefresh = source.slice(deferredStart, deferredEnd);
assert.match(deferredRefresh, /window\.requestAnimationFrame/, "Secondary work must wait for the switched viewport frame.");
assert.match(deferredRefresh, /window\.setTimeout\(\(\) =>/, "Secondary work must run after the browser can paint that frame.");
assert.match(deferredRefresh, /syncLinkedMachineToCurrentDesign\(\)/, "Deferred switching must preserve live plant-layout linking.");

assert.match(source, /if \(refresh && tab === "add"\) updateEmbeddedMachinePicker\(\)/, "Opening Build must refresh its machine picker.");
assert.match(source, /if \(refresh && tab === "plant"\) updateAssignmentPanel\(\)/, "Opening Place must refresh its assignment controls.");
assert.match(source, /if \(refresh && tab === "design"\) updateDesignFields\(\{ includeEnvelope: true \}\)/, "Opening the Machine inspector must refresh envelope geometry.");

console.log("Fast machine-switch viewport and deferred-panel checks passed.");
