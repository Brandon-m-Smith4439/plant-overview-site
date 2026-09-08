import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const registry = JSON.parse(fs.readFileSync(new URL("../cad/machine_registry.json", import.meta.url), "utf8"));
const designSource = fs.readFileSync(new URL("../public/machine-designs.js", import.meta.url), "utf8");

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist.`);
  const parametersStart = source.indexOf("(", start);
  let parameterDepth = 0;
  let bodyStart = -1;
  for (let index = parametersStart; index < source.length; index += 1) {
    if (source[index] === "(") parameterDepth += 1;
    if (source[index] === ")") parameterDepth -= 1;
    if (parameterDepth === 0) {
      bodyStart = source.indexOf("{", index);
      break;
    }
  }
  assert.notEqual(bodyStart, -1, `Could not find the body of ${name}.`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not read ${name}.`);
}

function runPlantSync(machine, design) {
  const context = {
    machine,
    design,
    normalizedMachineScaleEditMode: (value) => value === "individual" ? "individual" : "uniform",
    designBaseDimensions: (item) => ({ x: 0, y: 0, z: 0, ...item.base }),
    refreshMachineScaleMetadata: (item) => {
      item.scaleXPercent = item.w / item.naturalW * 100;
      item.scaleYPercent = item.h / item.naturalH * 100;
      item.scaleZPercent = item.d / item.naturalD * 100;
    },
  };
  vm.runInNewContext(`${functionSource(plant, "currentMachineScale")}\n${functionSource(plant, "syncMachineDimensionsToDesign")}\nsyncMachineDimensionsToDesign(machine, design);`, context);
  return machine;
}

function runStudioSync(machine, design) {
  const context = {
    machine,
    design,
    MIN_DESIGN_ENVELOPE: 0.01,
    normalizedMachineScaleEditMode: (value) => value === "individual" ? "individual" : "uniform",
  };
  vm.runInNewContext(`${functionSource(studio, "currentPlantObjectScale")}\n${functionSource(studio, "syncPlantObjectDimensions")}\nsyncPlantObjectDimensions(machine, design);`, context);
  return machine;
}

const scaledCuttingTable = {
  x: -220,
  z: -205,
  w: 81,
  d: 99,
  h: 7.5,
  naturalW: 54,
  naturalD: 66,
  naturalH: 5,
  scaleXPercent: 150,
  scaleYPercent: 150,
  scaleZPercent: 150,
  scaleEditMode: "uniform",
};
const revisedDesign = { base: { w: 60, d: 70, h: 8 } };

for (const synchronized of [
  runPlantSync(structuredClone(scaledCuttingTable), revisedDesign),
  runStudioSync(structuredClone(scaledCuttingTable), revisedDesign),
]) {
  assert.equal(synchronized.w, 90, "A Designer width change must retain the placed 150% scale.");
  assert.equal(synchronized.d, 105, "A Designer depth change must retain the placed 150% scale.");
  assert.equal(synchronized.h, 12, "A Designer height change must retain the placed 150% scale.");
  assert.equal(synchronized.scaleXPercent, 150);
  assert.equal(synchronized.scaleYPercent, 150);
  assert.equal(synchronized.scaleZPercent, 150);
  assert.equal(synchronized.x, -224.5, "Envelope synchronization must keep the layout center fixed.");
  assert.equal(synchronized.z, -208, "Envelope synchronization must keep the layout center fixed.");
}

const individuallyScaledMachine = {
  ...scaledCuttingTable,
  w: 81,
  d: 52.8,
  h: 6,
  scaleXPercent: 150,
  scaleYPercent: 120,
  scaleZPercent: 80,
  scaleEditMode: "individual",
};
for (const synchronized of [
  runPlantSync(structuredClone(individuallyScaledMachine), revisedDesign),
  runStudioSync(structuredClone(individuallyScaledMachine), revisedDesign),
]) {
  assert.equal(synchronized.w, 90);
  assert.ok(Math.abs(synchronized.d - 56) < 1e-9);
  assert.ok(Math.abs(synchronized.h - 9.6) < 1e-9);
  assert.equal(synchronized.scaleXPercent, 150);
  assert.equal(synchronized.scaleYPercent, 120);
  assert.equal(synchronized.scaleZPercent, 80);
  assert.equal(synchronized.scaleEditMode, "individual");
}

const designContext = { window: {} };
vm.runInNewContext(designSource, designContext);
const cuttingMachine = registry.machines.find((machine) => machine.id === "barefoot-cutting");
const cuttingDesign = designContext.window.PLANT_MACHINE_DESIGNS["cutting-standard"];
assert.ok(cuttingMachine && cuttingDesign, "The cutting machine and Designer preset must both exist.");
assert.deepEqual(
  { w: cuttingMachine.w, d: cuttingMachine.d, h: cuttingMachine.h },
  { w: cuttingDesign.base.w, d: cuttingDesign.base.d, h: cuttingDesign.base.h },
  "The Plant Layout cutting-table envelope must match its Designer envelope.",
);

assert.ok(studio.includes("changed = syncPlantObjectDimensions(machine, design) || changed;"), "Every linked Designer edit must synchronize its Plant Layout envelope.");
assert.ok(plant.includes("design.custom === true || normalizedDesignScaleMode(machine.designScaleMode) === \"match\""), "Custom design updates must synchronize regardless of sizing mode.");

console.log("Linked design envelope and placed-machine scale preservation checks passed.");
