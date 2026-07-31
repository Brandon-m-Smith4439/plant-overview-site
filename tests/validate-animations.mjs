import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [plantApp, studio, presets, html, page] = await Promise.all([
  readFile(path.join(root, "public", "plant-app.js"), "utf8"),
  readFile(path.join(root, "public", "machine-design-studio.js"), "utf8"),
  readFile(path.join(root, "public", "machine-designs.js"), "utf8"),
  readFile(path.join(root, "public", "machine-studio.html"), "utf8"),
  readFile(path.join(root, "app", "machine-studio", "page.tsx"), "utf8"),
]);

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(presets, sandbox);
const library = sandbox.window.PLANT_MACHINE_DESIGNS;
assert.ok(library && typeof library === "object", "Machine preset library did not load.");
const designs = Object.values(library);

const requiredDesigns = [
  "generic-box-standard", "cutting-standard", "filtration-standard",
  "crane-machine-standard", "bridge-crane-standard", "glass-rack-standard",
  "room-standard", "team-member-standard", "aframe-cart-standard",
  "aframe-truck-standard",
];
for (const id of requiredDesigns) {
  assert.ok(designs.some((design) => design.id === id), `Missing scene design preset: ${id}`);
}
assert.ok(
  designs.some((design) => design.components.some((component) => component.animationType && component.animationType !== "none")),
  "No built-in animated machine components were found.",
);

for (const type of ["animatedGlass", "animatedBox", "animatedPerson", "animatedCart", "animatedBeacon"]) {
  assert.ok(plantApp.includes(type), `Missing editable scene animation type: ${type}`);
}
for (const mode of ["loop", "pingPong", "spin", "bob", "pulse", "blink"]) {
  assert.ok(plantApp.includes(`value="${mode}"`) || plantApp.includes(`"${mode}"`), `Missing scene animation mode: ${mode}`);
}

assert.ok(!plantApp.includes("function drawGlass(time)"), "Legacy hard-coded production glass animation still exists.");
assert.ok(plantApp.includes("sceneAnimationsInitialized: true"), "Animation initialization/removal marker is not persisted.");
assert.ok(plantApp.includes("loadAnimationAwareMachines"), "Saved animation removals are not protected.");
assert.ok(plantApp.includes("animatedComponent" ) || plantApp.includes("animateDesignComponent"), "Plant design component animation support is missing.");

for (const markup of [html, page]) {
  assert.ok(markup.includes("preview-design-animations"), "Design animation preview control is missing.");
  assert.ok(markup.includes("animationAmount") && markup.includes("animationSpeed"), "Part animation inspector fields are missing.");
}
assert.ok(studio.includes("JSON.stringify({ version: 4"), "Machine design payload version was not advanced to 4.");
assert.ok(studio.includes("animatedComponent"), "Design Studio animation preview engine is missing.");

console.log("Scene and machine animation regression checks passed.");
