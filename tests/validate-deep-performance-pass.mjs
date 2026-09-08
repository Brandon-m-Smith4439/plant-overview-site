import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const renderer = fs.readFileSync("public/three-depth-scene-renderer.js", "utf8");
const plant = fs.readFileSync("public/plant-app.js", "utf8");
const designer = fs.readFileSync("public/machine-design-studio.js", "utf8");
const performanceSource = fs.readFileSync("public/render-performance.js", "utf8");

assert.match(renderer, /entry\.revision === revisionKey/, "unchanged instance batches must skip GPU uploads");
assert.match(renderer, /function beginTemplate/, "the renderer must retain reusable geometry templates");
assert.match(renderer, /function addGeometryInstances/, "the renderer must instance reusable detailed geometry");
assert.match(renderer, /instanceUploads/, "renderer diagnostics must count actual instance uploads");
assert.match(plant, /drawRetainedObject\("plant:shadows:static"/, "static shadows must use retained geometry");
assert.match(plant, /drawSharedDesignInstances/, "repeated detailed machine designs must share GPU geometry");
assert.match(plant, /overheadViewBounds/, "the overhead camera must spatially narrow machine candidates");
assert.match(designer, /state\.geometryRevision/, "Designer geometry must use an incremental revision");
assert.doesNotMatch(
  designer.slice(designer.indexOf("function designGeometrySignature"), designer.indexOf("function canvasPoint")),
  /components|forEach|visit/,
  "Designer cache signatures must not rescan every component",
);
assert.match(performanceSource, /Run 10-second benchmark/, "the Performance panel must expose a benchmark control");
assert.match(performanceSource, /sceneHeavy/, "automatic quality tuning must distinguish scene complexity");

let workerMessageHandler = null;
let workerResponse = null;
const workerContext = {
  self: {
    addEventListener(type, handler) { if (type === "message") workerMessageHandler = handler; },
    postMessage(message) { workerResponse = message; },
  },
};
vm.runInNewContext(fs.readFileSync("public/geometry-prep-worker.js", "utf8"), workerContext);
assert.equal(typeof workerMessageHandler, "function", "geometry worker must register its message handler");
workerMessageHandler({ data: {
  requestId: "test-design",
  design: {
    id: "roller-line",
    updatedAt: "2026-09-07T00:00:00.000Z",
    components: [
      { id: "bed", type: "rollerBed", visible: true, count: 5, x: 0, y: 1, z: 0, w: 12, d: 4 },
      { id: "guard", type: "box", visible: true, x: 0, y: 0, z: 0, w: 1, h: 2, d: 1, animationEnabled: true, animationType: "spin" },
    ],
  },
} });
assert.equal(workerResponse.requestId, "test-design");
assert.equal(workerResponse.result.partCount, 6, "roller counts must contribute their real render cost");
assert.equal(workerResponse.result.hasAnimation, true, "worker must detect animated machine parts");
assert.ok(workerResponse.result.signature, "worker must return a stable geometry signature");

let now = 0;
const performanceContext = {
  window: {
    addEventListener() {},
    dispatchEvent() {},
    devicePixelRatio: 1,
  },
  document: { hidden: false, addEventListener() {} },
  localStorage: { getItem() { return null; }, setItem() {} },
  performance: { now: () => now },
  CustomEvent: class CustomEvent {},
  Blob: class Blob {},
  URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
  console,
};
vm.runInNewContext(performanceSource, performanceContext);
const controller = performanceContext.window.createRenderPerformanceController();
assert.equal(controller.startBenchmark(1000), true, "benchmark should start once");
for (let frame = 0; frame < 70; frame += 1) {
  now += 16.667;
  controller.beginProfile();
  controller.beginPhase("machines");
  now += 2;
  controller.endPhase();
  controller.recordFrame(7);
}
assert.ok(controller.benchmarkResult, "benchmark must finish and retain its result");
assert.ok(controller.benchmarkResult.frames > 0, "benchmark must record rendered frames");
assert.ok(Number.isFinite(controller.benchmarkResult.p95FrameMs), "benchmark must calculate p95 frame time");

console.log("Deep performance caching, instancing, worker, culling, and benchmark checks passed.");
