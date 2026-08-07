import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [app, studio, css] = await Promise.all([
  readFile(path.join(root, "public", "plant-app.js"), "utf8"),
  readFile(path.join(root, "public", "machine-design-studio.js"), "utf8"),
  readFile(path.join(root, "app", "globals.css"), "utf8"),
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
assert.ok(css.includes(".multi-selection-panel"), "Multi-selection panel styling is missing.");
assert.ok(css.includes("multi-component-edit"), "Designer bulk-setting state is not styled.");

console.log("Multi-object selection regression checks passed.");
