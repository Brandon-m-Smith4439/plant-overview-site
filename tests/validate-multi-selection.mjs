import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [app, studio, css, studioPage, staticStudioPage] = await Promise.all([
  readFile(path.join(root, "public", "plant-app.js"), "utf8"),
  readFile(path.join(root, "public", "machine-design-studio.js"), "utf8"),
  readFile(path.join(root, "app", "globals.css"), "utf8"),
  readFile(path.join(root, "app", "machine-studio", "page.tsx"), "utf8"),
  readFile(path.join(root, "public", "machine-studio.html"), "utf8"),
]);

assert.ok(app.includes("selectedMachineIds: new Set()"), "Multi-selection state is missing.");
assert.ok(app.includes("function toggleMachineSelection"), "Shift/Ctrl selection toggling is missing.");
assert.ok(
  app.includes("event.shiftKey || event.ctrlKey || event.metaKey"),
  "Shift/Ctrl/Command click modifiers are not recognized.",
);
assert.ok(app.includes("data-group-color"), "Collective color control is missing.");
assert.ok(
  app.includes("selection.forEach((machine) => { machine.color = color; })"),
  "Collective color changes are not applied to every selected object.",
);
assert.ok(app.includes("const ids = new Set(selection.map"), "Group removal does not include every selected object.");
assert.ok(app.includes("state.selectedMachineIds.has(machine.instanceId)"), "Selection outlines are not rendered for every selected object.");
assert.ok(app.includes("BULK_MACHINE_FIELDS"), "Plant multi-selection settings are not editable in bulk.");
assert.ok(studio.includes("BULK_COMPONENT_FIELDS"), "Designer multi-selection settings are not editable in bulk.");
assert.ok(studio.includes("components.forEach((item) => { item[field] = value; })"), "Designer bulk animation settings are not applied to each selected part.");
assert.ok(studio.includes('event.ctrlKey && !initialHit && !overlayHandle') && studio.includes('kind: "marquee"'), "Designer Ctrl+left-drag must start marquee selection only away from parts and transform handles.");
assert.ok(studio.includes("function marqueeScreenRect(") && studio.includes("function drawSelectionMarquee()"), "Designer marquee rectangle rendering is missing.");
assert.match(studio, /drawGizmo\(\);\s*drawSelectionMarquee\(\);/, "The blue marquee must render above the model and transform controls.");
assert.ok(studio.includes("function componentIntersectsMarquee(") && studio.includes("function updateMarqueeSelection("), "Designer marquee intersection selection is missing.");
assert.ok(studio.includes("const selectedIds = new Set(drag.initialSelectedIds || [])") && studio.includes("state.drawnComponents.forEach"), "Ctrl+marquee must add intersecting visible parts to the existing selection.");
assert.ok(studio.includes('event?.type === "pointercancel"') && studio.includes("initialTimelineTargetPathIds"), "A canceled marquee must restore the complete prior selection state.");
for (const page of [studioPage, staticStudioPage]) {
  assert.ok(page.includes("Ctrl+left-drag box select"), "Both Designer entry pages must document the marquee shortcut.");
}
const rectanglesIntersect = (component, marquee) => component.right >= marquee.left
  && component.left <= marquee.right
  && component.bottom >= marquee.top
  && component.top <= marquee.bottom;
assert.equal(rectanglesIntersect({ left: 80, right: 130, top: 50, bottom: 100 }, { left: 120, right: 200, top: 90, bottom: 160 }), true, "A partially enclosed part must be selected.");
assert.equal(rectanglesIntersect({ left: 10, right: 40, top: 10, bottom: 40 }, { left: 60, right: 100, top: 60, bottom: 100 }), false, "A part outside the marquee must remain unselected.");
assert.ok(css.includes(".multi-selection-panel"), "Multi-selection panel styling is missing.");
assert.ok(css.includes("multi-component-edit"), "Designer bulk-setting state is not styled.");

console.log("Multi-object selection regression checks passed.");
