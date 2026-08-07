import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [plant, studio, html, page] = await Promise.all([
  readFile(path.join(root, "public", "plant-app.js"), "utf8"),
  readFile(path.join(root, "public", "machine-design-studio.js"), "utf8"),
  readFile(path.join(root, "public", "machine-studio.html"), "utf8"),
  readFile(path.join(root, "app", "machine-studio", "page.tsx"), "utf8"),
]);

assert.ok(plant.includes('DESIGN_SCALE_MODES = new Set(["preserve", "match", "stretch"])'), "Plant must support all three design sizing modes.");
assert.ok(plant.includes('return DESIGN_SCALE_MODES.has(value) ? value : "preserve"'), "Preserve proportions must be the default.");
assert.ok(plant.includes("const scaleEditMode = normalizedMachineScaleEditMode") && plant.includes("Math.min(ratioX, ratioY, ratioZ)"), "Preserve and uniform edit modes must use one uniform scale.");
assert.ok(plant.includes('offsetX: (Number(machine.w) - base.w * scaleX) / 2'), "Uniform designs must be centered in width.");
assert.ok(plant.includes('offsetZ: (Number(machine.d) - base.d * scaleZ) / 2'), "Uniform designs must be centered in depth.");
assert.ok(plant.includes('syncMachineDimensionsToDesign'), "Plant editor must support dimension synchronization.");
assert.ok(studio.includes('syncPlantObjectDimensions') && studio.includes('machine.designScaleMode === "match"'), "Live-linked match mode must synchronize dimensions.");
for (const source of [html, page]) {
  assert.ok(source.includes('assignment-scale-mode'), "Designer assignment UI must expose sizing mode.");
  assert.ok(source.includes('sync-machine-dimensions'), "Designer assignment UI must expose dimension synchronization.");
}
assert.ok(plant.includes('data-editor-action="sync-design-dimensions"'), "Plant editor must expose dimension synchronization.");

console.log("Design sizing mode and proportion-preservation regression checks passed.");
