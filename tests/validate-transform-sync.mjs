import assert from "node:assert/strict";
import fs from "node:fs";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../public/machine-studio.html", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/machine-studio/page.tsx", import.meta.url), "utf8");

assert.ok(plant.includes('data-machine-field="y"'), "Plant editor must expose Y position.");
assert.ok(plant.includes('data-machine-scale="uniform"'), "Plant editor must expose uniform percentage scale.");
assert.ok(plant.includes('data-machine-scale="x"') && plant.includes('data-machine-scale="y"') && plant.includes('data-machine-scale="z"'), "Plant editor must expose independent scale percentages.");
assert.ok(plant.includes("function resizeMachineAroundCenter"), "Plant dimensions need centered resize logic.");
assert.ok(plant.includes("function refreshMachineScaleMetadata"), "Plant scale metadata must stay synchronized with dimensions.");
assert.ok(plant.includes('type: "layout-updated"'), "Plant edits must broadcast live layout updates.");
assert.ok(plant.includes('"naturalW", "naturalD", "naturalH"') && plant.includes('"rotationX", "rotationY", "rotationZ"'), "Plant must reload exact transforms changed in the Designer.");
assert.ok(studio.includes("function reloadPlantLayout"), "Designer must reload changed Plant Layout transforms.");
assert.ok(studio.includes("function setPlantScalePercent"), "Designer must edit whole-object plant scale.");
assert.ok(studio.includes('data.componentScale') || studio.includes('dataset.componentScale'), "Designer part scale percentages must be wired.");
for (const source of [html, page]) {
  assert.ok(source.includes('data-instance-field="x"') && source.includes('data-instance-field="rotationY"'), "Designer must expose plant instance position and rotation values.");
  assert.ok(source.includes('data-instance-scale="uniform"') && source.includes('data-instance-scale="z"'), "Designer must expose plant instance percentage scale.");
  assert.ok(source.includes('data-component-scale="uniform"') && source.includes('data-component-scale="z"'), "Designer must expose part percentage scale.");
}
console.log("Unified transform and live synchronization checks passed.");
