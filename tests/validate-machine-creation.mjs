import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..");
const studio = fs.readFileSync(path.join(root, "public/machine-design-studio.js"), "utf8");
const plant = fs.readFileSync(path.join(root, "public/plant-app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "public/machine-studio.html"), "utf8");
const tsx = fs.readFileSync(path.join(root, "app/machine-studio/page.tsx"), "utf8");

for (const source of [html, tsx]) {
  assert.match(source, /id=["']save-design["']/);
  assert.match(source, /id=["']save-design-as["']/);
  assert.match(source, /id=["']save-and-place-design["']/);
  assert.match(source, /id=["']save-design-as-dialog["']/);
  assert.match(source, /id=["']create-plant-machine["']/);
  assert.match(source, /id=["']new-plant-machine-name["']/);
  assert.match(source, /id=["']new-plant-machine-stage["']/);
  assert.match(source, /id=["']new-plant-machine-placement["']/);
  assert.match(source, /id=["']add-machine-design["']/);
  assert.match(source, /id=["']add-machine-design-button["']/);
}
assert.match(studio, /function createPlantMachineFromCurrentDesign\(\)/);
assert.match(studio, /function saveCurrentDesign\(options = \{\}\)/);
assert.match(studio, /function saveDesignAs\(requestedName, requestedType\)/);
assert.match(studio, /saveCurrentDesign\(\{ silent: true \}\)/);
assert.match(studio, /function plantLayoutUrl\(machineId = ""\)/);
assert.match(studio, /open-created-plant-machine/);
assert.match(studio, /designId: design\.id/);
assert.match(studio, /designScaleMode: "match"/);
assert.match(studio, /placement_status: "designer_created"/);
assert.match(studio, /findPlantPlacement\(base\.w, base\.d, placementMode\)/);
assert.match(studio, /plantLayout\.machines\.push\(machine\)/);
assert.match(studio, /state\.linkedMachineId = instanceId/);
assert.match(studio, /function addMachineDesignToCurrentDesign\(sourceId\)/);
assert.match(studio, /function cloneComponentTreeForEmbedding\(component\)/);
assert.match(studio, /embeddedMachine: true/);
assert.match(studio, /source\.id === design\.id/);
assert.match(studio, /children\.forEach\(\(child\) => translateComponent\(child, dx, dy, dz\)\)/);
assert.doesNotMatch(studio, /design\.base\.w = Math\.max\(Number\(design\.base/);
assert.match(studio, /Keep the destination envelope unchanged when embedding another machine/);
assert.match(studio, /state\.timelineTargetId = embedded\.id/);
assert.match(studio, /component\.embeddedMachine === true/);
assert.match(plant, /component\.embeddedMachine === true/);
assert.match(plant, /animateDesignComponent\(child, time, design\)/);
assert.match(plant, /machines\.push\(normalizeMachine\(incoming/);
assert.match(plant, /localIds\.has\(incoming\.instanceId\)/);
assert.match(plant, /initialParams\.get\("machine"\)/);
assert.match(plant, /setSingleSelection\(initialMachine\.instanceId\)/);
console.log("Machine creation workflow validation passed.");


// Embedded machines must retain source design units without silently changing
// the destination envelope, otherwise Plant Layout can rescale the whole design.
const addEmbeddedFunction = studio.match(/function addMachineDesignToCurrentDesign\(sourceId\) \{[\s\S]*?\n  \}\n\n  function selectDesign/)?.[0] || "";
assert.ok(addEmbeddedFunction, "Could not inspect the embedded-machine insertion function.");
assert.doesNotMatch(addEmbeddedFunction, /design\.base\.[wdh]\s*=/, "Embedding a machine must not mutate the destination design envelope.");

for (const token of [
  "function designComponentCenter(component)",
  "Wheels use x/y/z as their center",
  "const currentCenter = designComponentCenter(component)",
  "const originalCenter = designComponentCenter(target)",
]) {
  assert.ok(plant.includes(token), `Plant animation transform parity is missing: ${token}`);
}
