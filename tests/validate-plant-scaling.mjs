import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [plant, studio, css] = await Promise.all([
  readFile(path.join(root, "public", "plant-app.js"), "utf8"),
  readFile(path.join(root, "public", "machine-design-studio.js"), "utf8"),
  readFile(path.join(root, "app", "globals.css"), "utf8"),
]);

assert.ok(plant.includes('MACHINE_SCALE_EDIT_MODES = new Set(["uniform", "individual"])'), "Plant Layout must support explicit uniform and individual scale modes.");
assert.ok(plant.includes('data-machine-scale-mode="uniform"') && plant.includes('data-machine-scale-mode="individual"'), "Plant Layout must expose both scale-mode buttons.");
assert.ok(plant.includes('data-scale-fields="uniform"') && plant.includes('data-scale-fields="individual"'), "Scale values must be grouped by the selected mode.");
assert.ok(plant.includes('machine.scaleEditMode = "uniform"') && plant.includes('machine.scaleEditMode = "individual"'), "Scale edits must persist the chosen mode.");
assert.ok(plant.includes('const scaleEditMode = normalizedMachineScaleEditMode(machine?.scaleEditMode, machine)'), "Custom-design placement must use the selected scaling mode.");
assert.ok(plant.includes('setMachineScalePercent(item, "uniform"'), "Dimension edits in uniform mode must resize every axis proportionally.");
assert.ok(plant.includes('"scaleEditMode"'), "Live Plant Layout synchronization must include scale mode metadata.");
assert.ok(studio.includes('normalizedMachineScaleEditMode') && studio.includes('machine.scaleEditMode = "individual"'), "Machine Design Studio must preserve Plant Layout scaling mode during linked edits.");
assert.ok(css.includes('.scale-mode-selector') && css.includes('.scale-axis-fields'), "Readable scale-mode and axis-field styling must be present.");
assert.match(css, /\.scale-value-fields input[\s\S]*min-height:\s*42px/, "Scale inputs must be large enough to read numeric values.");
assert.match(css, /font-size:\s*13px\s*!important/, "Scale values must use a readable numeric font size.");

console.log("Plant Layout scaling mode and readable input regression checks passed.");
