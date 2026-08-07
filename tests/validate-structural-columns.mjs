import assert from "node:assert/strict";
import fs from "node:fs";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const plantDataSource = fs.readFileSync(new URL("../public/plant-data.js", import.meta.url), "utf8");
const sandbox = { window: {} };
new Function("window", plantDataSource)(sandbox.window);
const cadColumns = sandbox.window.PLANT_CAD_DATA.columns;

assert.equal(cadColumns.length, 118, "The supplied CAD dataset should expose all 118 structural column anchors.");
assert.deepEqual(cadColumns.at(-1), [226.54, 39.95], "The eastern CAD structure columns must remain present in the source dataset.");

assert.ok(plant.includes("const BASE_COLUMN_COUNT = data.columns.length"), "Every CAD-derived structural column must be included in the existing plant footprint.");
assert.ok(plant.includes("const MAX_GENERATED_COLUMNS = 6000"), "Generated columns need a hard performance budget.");
assert.ok(plant.includes("function structuralColumns()"), "Automatic structural-grid generation is missing.");
assert.ok(plant.includes('key: `grid:${ix}:${iz}`'), "Generated columns need stable coordinate-based identifiers.");
assert.ok(plant.includes("outsideOriginal"), "Generated columns must be limited to floor extensions outside the original CAD footprint.");
assert.ok(plant.includes("hiddenColumnKeys"), "Generated pillar visibility must persist independently of legacy CAD indices.");
assert.ok(plant.includes("invalidateStructuralColumns()"), "Floor and grid edits must invalidate the cached structural layout.");
assert.ok(plant.includes('data-column-grid-check="autoExtend"'), "Structure controls need an automatic-extension switch.");
assert.ok(plant.includes('data-column-grid-field="spacingX"'), "Structure controls need X bay spacing.");
assert.ok(plant.includes('data-column-grid-field="spacingZ"'), "Structure controls need Z bay spacing.");
assert.ok(plant.includes("for (const column of structuralColumns())"), "First-person collision must include generated columns.");
assert.ok(css.includes(".column-grid-controls"), "Automatic-column controls need dedicated styling.");

const cadBounds = [-233.33, -212.5, 237.5, 50];
const grid = { spacingX: 40, spacingZ: 30, anchorX: -220.04, anchorZ: -199.97 };
function generatedPoints(bounds) {
  const insetX = Math.min(12, grid.spacingX * 0.25);
  const insetZ = Math.min(10, grid.spacingZ * 0.25);
  const minIx = Math.ceil((bounds[0] + insetX - grid.anchorX) / grid.spacingX);
  const maxIx = Math.floor((bounds[2] - insetX - grid.anchorX) / grid.spacingX);
  const minIz = Math.ceil((bounds[1] + insetZ - grid.anchorZ) / grid.spacingZ);
  const maxIz = Math.floor((bounds[3] - insetZ - grid.anchorZ) / grid.spacingZ);
  const points = [];
  for (let ix = minIx; ix <= maxIx; ix += 1) {
    const x = grid.anchorX + ix * grid.spacingX;
    for (let iz = minIz; iz <= maxIz; iz += 1) {
      const z = grid.anchorZ + iz * grid.spacingZ;
      if (x < cadBounds[0] - 0.25 || x > cadBounds[2] + 0.25 || z < cadBounds[1] - 0.25 || z > cadBounds[3] + 0.25) {
        points.push({ key: `grid:${ix}:${iz}`, x, z });
      }
    }
  }
  return points;
}

assert.equal(generatedPoints(cadBounds).length, 0, "The original CAD floor must not receive duplicate generated columns.");
const widened = generatedPoints([cadBounds[0] - 40, cadBounds[1], cadBounds[2] + 40, cadBounds[3]]);
assert.ok(widened.some((point) => Math.abs(point.x - (-260.04)) < 0.01), "A west extension should continue the 40 ft X grid.");
assert.ok(widened.some((point) => Math.abs(point.x - 259.96) < 0.01), "An east extension should continue the 40 ft X grid.");
const lengthened = generatedPoints([cadBounds[0], cadBounds[1] - 30, cadBounds[2], cadBounds[3] + 30]);
assert.ok(lengthened.some((point) => Math.abs(point.z - (-229.97)) < 0.01), "A south extension should continue the 30 ft Z grid.");
assert.ok(lengthened.some((point) => Math.abs(point.z - 70.03) < 0.01), "A north extension should continue the 30 ft Z grid.");
assert.equal(new Set([...widened, ...lengthened].map((point) => point.key)).size, widened.length + lengthened.length, "Grid keys must remain unique across extension directions.");

console.log("Automatic structural-column continuation checks passed.");
