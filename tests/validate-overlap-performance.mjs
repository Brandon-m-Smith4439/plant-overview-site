import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist.`);
  const bodyStart = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not read ${name}.`);
}

const machines = Array.from({ length: 3000 }, (_, index) => ({
  instanceId: `machine-${index}`,
  visible: true,
  collisionMode: "solid",
  reveal: 0,
  retire: 99,
  x: (index % 60) * 10,
  y: 0,
  z: Math.floor(index / 60) * 10,
  w: 4,
  d: 4,
  h: 5,
  rotationY: index % 7,
}));

const context = {
  machines,
  stageAlpha: () => 1,
  performance,
  console,
};
vm.runInNewContext([
  "let overlapCacheSignature = ''; let overlapCacheIds = new Set(); let overlapCachePairs = [];",
  functionSource(plant, "collisionCandidates"),
  functionSource(plant, "angleRadians"),
  functionSource(plant, "localPoint"),
  functionSource(plant, "footprint"),
  functionSource(plant, "rectangleAxes"),
  functionSource(plant, "projectRectangle"),
  functionSource(plant, "machinesOverlap"),
  functionSource(plant, "overlapSignature"),
  functionSource(plant, "overlapPairs"),
  "const startedAt = performance.now(); const firstPairs = overlapPairs(); const firstDuration = performance.now() - startedAt;",
  "const cachedAt = performance.now(); const cachedPairs = overlapPairs(); const cachedDuration = performance.now() - cachedAt;",
  "result = { firstPairs: firstPairs.length, cachedPairs: cachedPairs.length, firstDuration, cachedDuration };",
].join("\n"), context);

assert.equal(context.result.firstPairs, 0, "Separated synthetic machines must not report overlaps.");
assert.equal(context.result.cachedPairs, 0, "The cached overlap result must remain stable.");
assert.ok(context.result.firstDuration < 1500, `Spatial overlap scan took ${context.result.firstDuration.toFixed(1)} ms for 3,000 objects.`);
assert.ok(context.result.cachedDuration < context.result.firstDuration, "An unchanged editor refresh should reuse the overlap result.");

console.log(`Spatial overlap performance passed: 3,000 objects in ${context.result.firstDuration.toFixed(1)} ms; cached ${context.result.cachedDuration.toFixed(3)} ms.`);
