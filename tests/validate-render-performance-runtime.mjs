import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/render-performance.js", import.meta.url), "utf8");
let now = 16;
const listeners = new Map();
const context = {
  window: {
    addEventListener(type, listener) { listeners.set(type, listener); },
    dispatchEvent() {},
    devicePixelRatio: 1,
  },
  document: {
    hidden: false,
    addEventListener(type, listener) { listeners.set(type, listener); },
  },
  localStorage: {
    getItem() { return null; },
    setItem() {},
  },
  performance: { now: () => now },
  CustomEvent: class CustomEvent {},
  console,
};

vm.runInNewContext(source, context);
const controller = context.window.createRenderPerformanceController();

assert.equal(controller.shouldRender(16), true, "The initial dirty scene must render.");
now = 100;
assert.equal(controller.shouldRender(100), false, "An unchanged static scene must not redraw on an idle timer.");
controller.invalidate();
now = 120;
assert.equal(controller.shouldRender(120), true, "An invalidated static scene must redraw once.");
controller.noteInteraction(180);
now = 140;
assert.equal(controller.shouldRender(140, { interacting: true }), true, "Active camera movement must continue rendering smoothly.");

const initialDetailBudget = controller.maxDetailedParts();
const initialMachineBudget = controller.maxDetailedMachines();
for (let index = 0; index < 24; index += 1) {
  now += 40;
  controller.recordFrame(40);
}
assert.ok(controller.maxDetailedParts() < initialDetailBudget, "Auto mode must lower geometry complexity after sustained slow frames.");
assert.ok(controller.maxDetailedMachines() < initialMachineBudget, "Auto mode must lower the number of fully detailed distant machines after sustained slow frames.");

console.log("On-demand static rendering and interaction redraw checks passed.");
