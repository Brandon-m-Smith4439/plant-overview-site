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
assert.ok(plantApp.includes("loadSceneAwareMachines"), "Saved animation removals are not protected.");
assert.ok(plantApp.includes("animatedComponent" ) || plantApp.includes("animateDesignComponent"), "Plant design component animation support is missing.");

for (const markup of [html, page]) {
  assert.ok(markup.includes("preview-design-animations"), "Design animation preview control is missing.");
  assert.ok(markup.includes("animation-timeline-workspace") && markup.includes("timeline-type-palette") && markup.includes("timeline-clip-editor"), "Docked part animation timeline controls are missing.");
  assert.ok(markup.includes("cycleSeconds") && markup.includes("step4Pause"), "Type-specific timeline timing controls are missing.");
}
assert.ok(studio.includes("version: 17"), "Machine design payload version was not advanced to 17.");
assert.ok(studio.includes("animatedComponent"), "Design Studio animation preview engine is missing.");
assert.ok(plantApp.includes("animationPauseSeconds"), "Scene animation pause timing is missing.");
assert.ok(plantApp.includes("pauseSeconds * 2"), "Back-and-forth animations do not pause at both endpoints.");
assert.ok(studio.includes("componentAnimationWave"), "Design Studio pause-aware animation timing is missing.");
assert.ok(studio.includes("animationPausedAt") && studio.includes("animationTimeOffset"), "Designer pause/resume clock is missing.");
assert.ok(plantApp.includes("data-toggle=\"animations\"") && plantApp.includes("effectiveAnimationTime"), "Plant pause/resume control is missing.");
assert.ok(plantApp.includes('axis === "all") transform.rotation[0]') && plantApp.includes('axis === "all") transform.rotation[2]'), "Scene spin animation does not rotate all axes.");
assert.ok(studio.includes('axis === "all") animated.rotationX') && studio.includes('axis === "all") animated.rotationZ'), "Machine-part spin animation does not rotate all axes.");
assert.ok(plantApp.includes('select-production-glass'), "Moving-glass quick selection is missing from the layout editor.");
assert.ok(plantApp.includes('machine.rotation = machine.rotationY'), "Y-axis nudge rotation is not synchronized with the all-axis rotation fields.");
for (const markup of [html, page]) {
  assert.ok(markup.includes("select-all-components"), "Select entire machine control is missing.");
}
assert.ok(studio.includes("selectAllComponents") && studio.includes("rotateSelectionTogether") && studio.includes("scaleSelectionTogether"), "Whole-machine transform support is incomplete.");
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} was not found.`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} could not be parsed.`);
}

const timingSandbox = { Math, Number, effectiveAnimationTime: (time) => time };
vm.createContext(timingSandbox);
vm.runInContext(`${extractFunction(plantApp, "animationWave")}; this.animationWave = animationWave;`, timingSandbox);
const pausedPingPong = { animationMode: "pingPong", animationSpeed: 1, animationPauseSeconds: 2, animationPhase: 0 };
assert.ok(Math.abs(timingSandbox.animationWave(pausedPingPong, 250).pingPong - 0.5) < 1e-9, "Back-and-forth motion did not reach the positive endpoint.");
assert.ok(Math.abs(timingSandbox.animationWave(pausedPingPong, 1500).pingPong - 0.5) < 1e-9, "Back-and-forth motion did not remain paused at the positive endpoint.");
assert.ok(Math.abs(timingSandbox.animationWave(pausedPingPong, 3500).pingPong + 0.5) < 1e-9, "Back-and-forth motion did not remain paused at the negative endpoint.");
assert.ok(Math.abs(timingSandbox.animationWave(pausedPingPong, 5000).pingPong) < 1e-9, "Back-and-forth motion did not resume at the next cycle.");
const pausedLoop = { animationMode: "loop", animationSpeed: 1, animationPauseSeconds: 2, animationPhase: 0 };
assert.equal(timingSandbox.animationWave(pausedLoop, 1500).wrapped, 1, "Loop animation did not pause after completing its movement.");
assert.equal(timingSandbox.animationWave(pausedLoop, 3000).wrapped, 0, "Loop animation did not resume after the pause duration.");

console.log("Scene and machine animation regression checks passed.");
