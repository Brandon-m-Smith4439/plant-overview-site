import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plant = await readFile(new URL("../public/plant-app.js", import.meta.url), "utf8");

const persistSource = plant.match(/function persistLayout\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
assert.ok(persistSource, "Could not inspect the Plant Layout save path.");
assert.match(
  persistSource,
  /renderPerformance\.invalidate\(\)/,
  "Saved layout edits must invalidate the static renderer so scaled envelopes redraw immediately.",
);

const scaleListenerStart = plant.lastIndexOf('panel.querySelectorAll("[data-machine-scale]")');
const scaleListenerEnd = plant.indexOf('panel.querySelectorAll("[data-machine-check]")', scaleListenerStart);
const scaleListenerSource = plant.slice(scaleListenerStart, scaleListenerEnd);
assert.match(scaleListenerSource, /setMachineScalePercent\(item, input\.dataset\.machineScale, percent\)/);
assert.match(scaleListenerSource, /persistLayout\(\)/, "Scale edits must pass through the invalidating save path.");

const scaleFunction = plant.match(/function setMachineScalePercent\(machine, axis, percent\) \{[\s\S]*?\n  \}/)?.[0] || "";
assert.match(scaleFunction, /resizeMachineAroundCenter\(machine, "w", reference\.w \* value \/ 100\)/);
assert.match(scaleFunction, /resizeMachineAroundCenter\(machine, "h", reference\.h \* value \/ 100\)/);
assert.match(scaleFunction, /resizeMachineAroundCenter\(machine, "d", reference\.d \* value \/ 100\)/);
assert.match(scaleFunction, /if \(axis === "x"\)/);
assert.match(scaleFunction, /if \(axis === "y"\)/);
assert.match(scaleFunction, /if \(axis === "z"\)/);

assert.match(plant, /overlayPolygon\(footprint\(machine,2,\.3\)/, "The selected envelope must use the machine's current dimensions.");
assert.match(plant, /const ratioX = .*Number\(machine\.w\).*\/ base\.w/);
assert.match(plant, /const ratioY = .*Number\(machine\.h\).*\/ base\.h/);
assert.match(plant, /const ratioZ = .*Number\(machine\.d\).*\/ base\.d/);

console.log("Plant scale-to-envelope redraw validation passed.");
