import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/render-performance.js", import.meta.url), "utf8");
let now = 16;
const listeners = new Map();
function addListener(key, listener) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(listener);
}
function removeListener(key, listener) {
  listeners.get(key)?.delete(listener);
  if (!listeners.get(key)?.size) listeners.delete(key);
}
const context = {
  window: {
    addEventListener(type, listener) { addListener(`window:${type}`, listener); },
    removeEventListener(type, listener) { removeListener(`window:${type}`, listener); },
    dispatchEvent() {},
    devicePixelRatio: 1,
  },
  document: {
    hidden: false,
    addEventListener(type, listener) { addListener(`document:${type}`, listener); },
    removeEventListener(type, listener) { removeListener(`document:${type}`, listener); },
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
assert.equal(controller.pixelRatio(2),1.5,"CPU-bound frames should reduce detail while preserving sharp render resolution");

const gpuController=context.window.createRenderPerformanceController();
gpuController.setRendererStats({gpuMs:30,gpuTimingSupported:true});
for(let i=0;i<24;i++) { now+=40; gpuController.recordFrame(4); }
assert.equal(gpuController.pixelRatio(2),1.5,"GPU pressure must preserve image resolution and shed geometry/detail work first");
assert.ok(gpuController.maxDetailedParts() < initialDetailBudget,"GPU pressure should still lower scene-detail work while keeping the image sharp");

const benchmarkController=context.window.createRenderPerformanceController();
benchmarkController.startBenchmark(1000);
for(let i=0;i<26;i++) { now+=40; benchmarkController.recordFrame(3); }
assert.equal(benchmarkController.benchmarkResult.p95FrameMs,3,"CPU submission remains separately reported");
assert.equal(benchmarkController.benchmarkResult.p95IntervalMs,40,"frame cadence must expose stalls hidden by short CPU submissions");
assert.equal(benchmarkController.benchmarkResult.onePercentLowFps,25);
assert.equal(benchmarkController.benchmarkResult.gpuTimingSupported,false,"unsupported GPU timing must be explicit");

controller.dispose();
gpuController.dispose();
benchmarkController.dispose();
assert.equal(listeners.size, 0, "Disposed route controllers must release every global invalidation listener.");

console.log("On-demand static rendering and interaction redraw checks passed.");
