import assert from "node:assert/strict";
import fs from "node:fs";

const controller = fs.readFileSync(new URL("../public/render-performance.js", import.meta.url), "utf8");
const renderer = fs.readFileSync(new URL("../public/depth-scene-renderer.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const studioPage = fs.readFileSync(new URL("../app/machine-studio/page.tsx", import.meta.url), "utf8");

assert.ok(controller.includes("createRenderPerformanceController"), "Shared adaptive renderer controller is missing.");
assert.ok(controller.includes("animationFps: 30"), "Balanced animation frame limiting is missing.");
assert.ok(controller.includes("pixelRatioCap: 1.35"), "Auto render-resolution cap is missing.");
assert.ok(controller.includes("shadowLayers"), "Shadow quality budgets are missing.");
assert.ok(controller.includes("document.hidden"), "Hidden tabs must stop rendering work.");
assert.ok(renderer.includes("bufferSubData"), "WebGL buffers should be reused instead of reallocated every draw.");
assert.ok(renderer.includes("colorCache"), "Repeated CSS color parsing should be cached.");
assert.ok(plant.includes("renderPerformance.shouldRender"), "Plant render loop is not frame-budgeted.");
assert.ok(plant.includes("projectedBoxVisible"), "Plant objects must be culled outside the viewport.");
assert.ok(plant.includes("renderPerformance.maxShadowParts"), "Plant custom shadows need a bounded part budget.");
assert.ok(studio.includes("depthRenderer.available ? 1"), "WebGL designer should not retain obsolete painter subdivisions.");
assert.ok(studio.includes("span / 120"), "Designer grid density must be bounded for large models.");
assert.ok(studio.includes("renderPerformance.shouldRender"), "Designer render loop is not frame-budgeted.");
assert.ok(page.includes('/render-performance.js'), "Plant page does not load the performance controller.");
assert.ok(studioPage.includes('/render-performance.js'), "Designer page does not load the performance controller.");
console.log("Adaptive rendering, culling, bounded shadows, and WebGL reuse checks passed.");
