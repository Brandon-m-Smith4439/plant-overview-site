import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const plant = fs.readFileSync("public/plant-app.js", "utf8");
const designer = fs.readFileSync("public/machine-design-studio.js", "utf8");
const retainedRenderer = fs.readFileSync("public/three-depth-scene-renderer.js", "utf8");
const loader = fs.readFileSync("app/legacy-script-loader.tsx", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

assert.equal(packageJson.dependencies.three, "0.160.1", "Three.js must be a reproducible application dependency");
assert.match(loader, /await import\("three"\)/, "the application must load Three.js before legacy renderer scripts");
assert.match(retainedRenderer, /powerPreference:\s*"high-performance"/, "the retained renderer should request the high-performance GPU");
assert.match(retainedRenderer, /function beginObject/, "the renderer must retain individual scene objects");
assert.match(retainedRenderer, /CACHE_RETENTION_MS/, "stale renderer resources must expire by elapsed time when FPS is low");
assert.match(retainedRenderer, /InstancedMesh/, "the renderer must support hardware instancing");
assert.match(retainedRenderer, /getStats/, "the renderer must expose diagnostic counters");
assert.match(retainedRenderer, /scratchEuler\.set\(\.\.\.instanceEulerRadians\(instance\)\)/, "instanced geometry must use the plant-to-Three rotation conversion");
assert.doesNotMatch(retainedRenderer, /attribute vec4 color;/, "Three.js must own the injected color attribute declaration");
assert.doesNotMatch(retainedRenderer, /attribute vec3 instanceColor;/, "Three.js must own the injected instance-color declaration");
assert.match(retainedRenderer, /diagnostics\?\.runnable === false/, "a rejected first-frame shader must activate the compatible renderer");
assert.match(retainedRenderer, /get available\(\) \{ return available; \}/, "renderer availability must update after a runtime GPU failure");
assert.match(plant, /addBoxInstances\("plant:structural-columns"/, "plant pillars should render as one instanced batch");
assert.match(plant, /addBoxInstances\("plant:machine-lod-proxies"/, "distant machine proxies should render as an instanced batch");
assert.match(plant, /function machineLodLevel/, "plant rendering must use multi-level detail");
assert.match(plant, /minimumOverviewLevel/, "overview LOD must preserve recognizable machine detail");
assert.match(plant, /transitioningStaticEntries/, "timeline transitions must not rebuild every settled machine shadow");
assert.match(plant, /cachedProductionInstanceMatrix/, "sampled production animations must reuse unchanged transform matrices");
assert.match(plant, /currentMachineSpatialIndex/, "first-person visibility should use the shared spatial index");
assert.match(plant, /currentWalkSpatialIndex/, "first-person collision should use the shared spatial index");
assert.match(designer, /designGeometrySignature/, "Designer geometry should retain unchanged scene data");
assert.match(designer, /componentListStructureSignature/, "Designer lists should avoid identical DOM rebuilds");

const pointerMove = plant.slice(plant.indexOf('canvas.addEventListener("pointermove"'), plant.indexOf("function finishPointer"));
assert.match(pointerMove, /updateEditorLiveTransformFields\(\)/, "layout dragging should use the lightweight inspector update");
assert.doesNotMatch(pointerMove, /updateEditorPanel\(\)/, "layout dragging must not rebuild the full inspector");

const eulerStart = retainedRenderer.indexOf("function instanceEulerRadians(instance)");
const eulerEnd = retainedRenderer.indexOf("\n\n    function composeInstanceMatrix", eulerStart);
assert.ok(eulerStart >= 0 && eulerEnd > eulerStart, "the instanced rotation conversion helper must be present");
const instanceEulerRadians = new Function(`${retainedRenderer.slice(eulerStart, eulerEnd)}; return instanceEulerRadians;`)();
const [, positivePlantY] = instanceEulerRadians({ rotationY: 90 });
const [, legacyPlantY] = instanceEulerRadians({ rotation: 90 });
assert.ok(Math.abs(positivePlantY + Math.PI / 2) < 1e-10, "positive plant Y rotation must be negated for Three.js instancing");
assert.ok(Math.abs(legacyPlantY + Math.PI / 2) < 1e-10, "legacy rotation values must use the same instanced direction");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync("public/spatial-index.js", "utf8"), context);
const index = context.window.createPlantSpatialIndex({ cellSize: 20 });
const items = Array.from({ length: 3000 }, (_, id) => ({ id, x: (id % 100) * 10, z: Math.floor(id / 100) * 10, w: 4, d: 4 }));
index.setItems(items);
const nearby = index.queryPoint(505, 155, 12);
assert.ok(nearby.length > 0, "spatial query should return nearby plant objects");
assert.ok(nearby.length < items.length / 20, "spatial query should not scan the full plant collection");

console.log(`Retained Three.js, instancing, LOD, Designer caching, and spatial-index checks passed (${nearby.length} nearby of ${items.length}).`);
