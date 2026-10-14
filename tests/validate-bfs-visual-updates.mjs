import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const plant = await readFile(new URL("../public/plant-app.js", import.meta.url), "utf8");
const renderer = await readFile(new URL("../public/three-depth-scene-renderer.js", import.meta.url), "utf8");
assert.match(plant, /PROCESS_CONNECTION_ANCHOR_MIN_PERCENT = -5000/);
assert.match(plant, /PROCESS_CONNECTION_ANCHOR_MAX_PERCENT = 5100/);
assert.match(plant, /data-process-connection-field="startAnchorXPercent" min="-5000" max="5100"/);
assert.match(plant, /data-process-connection-field="endAnchorZPercent" min="-5000" max="5100"/);
assert.ok(plant.includes('data-label-field="labelLeaderExtensionFeet"'));
assert.ok(plant.includes('labelLeaderExtensionFeet: clamp('));
assert.ok(plant.includes("function drawPhysicalLabelLeader("));
assert.ok(plant.includes("drawPhysicalLabelLeader("));
assert.ok(plant.includes('machine.labelLineStyle,'));
assert.ok(plant.includes('data-label-field="labelLineStyle"'));
assert.ok(plant.includes('data-label-field="labelLineShape"'));
assert.ok(plant.includes('machine.labelLineShape,'));
assert.ok(!plant.includes('depthRenderer.addLine?.(\n        leaderAnchor,'));
assert.ok(plant.includes('const arrowClearance=connection.endStyle==="arrow"'));
assert.ok(plant.includes('const drawnPath=arrowClearance>0?worldRouteSlice(metrics,0,flowDistance):route.worldPath;'));
assert.ok(plant.includes("drawWorldRouteMotionArrow(metrics,from,to"));
assert.ok(!plant.includes('addWorldRoutePrism(slice,Math.max(.12,coreWidth*.38)'));
assert.ok(renderer.includes("function worldLabelGlyphSideGeometry("));
assert.ok(renderer.includes("entry.frontGlyphSides.geometry = entry.glyphGeometry"));
assert.ok(renderer.includes("entry.backGlyphSides.geometry = entry.glyphGeometry"));
assert.ok(renderer.includes("entry.frontGlyphSides.scale.set(worldWidth, worldHeight, textExtrude)"));
assert.ok(renderer.includes("entry.glyphGeometry?.dispose?.()"));

// Exercise actual glyph contour generation with a synthetic 'ink' area.
const geometryStart = renderer.indexOf("    function worldLabelGlyphSideGeometry(");
const geometryEnd = renderer.indexOf("    function createWorldLabelEntry(", geometryStart);
assert.ok(geometryStart >= 0 && geometryEnd > geometryStart);
const geometrySource = renderer.slice(geometryStart, geometryEnd);
class BufferGeometry {
  setAttribute(key, data) { this[key] = data; }
  computeBoundingSphere() {}
}
const THREE = { BufferGeometry, Float32BufferAttribute: class {constructor(array, count) {this.array=array;this.count=count;} } };
const canvas = {
  width: 18, height: 18,
  getContext: () => ({
    getImageData: () => {
      const data = new Uint8ClampedArray(18 * 18 * 4);
      for (let y = 4; y < 14; y++)
        for (let x = 4; x < 14; x++) data[(y * 18 + x) * 4 + 3] = 255;
      return { data };
    },
  }),
};
const makeGeometry = new Function("THREE",geometrySource + "\nreturn worldLabelGlyphSideGeometry;")(THREE);
const output = makeGeometry(canvas);
assert.ok(output.position.array.length >= 72, "Text ink should have true vertical sidewall triangles.");
assert.ok(output.position.array.includes(0) && output.position.array.includes(1), "Sidewall geometry must extend in Z, not only along a flat plane.");

// White highlight arrows should have a tail, triangle head and forward tip.
const arrowStart = plant.indexOf("  function drawWorldRouteMotionArrow(");
const arrowEnd = plant.indexOf("  function drawFloorProcessFlow(",arrowStart);
assert.ok(arrowStart >= 0 && arrowEnd > arrowStart);
const polygons = [];
const drawArrow = new Function("worldRoutePointAt","depthRenderer",plant.slice(arrowStart,arrowEnd) + "\nreturn drawWorldRouteMotionArrow;")(
  (_,distance)=>[distance,0,0],
  { addPolygon(points,color){polygons.push({points,color});} },
);
drawArrow({total:30},2,5,1,1,.08);
assert.equal(polygons.length,2,"Moving arrow needs a separate shaft and triangular point.");
assert.equal(polygons[1].points[1][0],5,"Arrow tip must point forward toward route destination.");
assert.equal(polygons[1].color,"#f2ffff");
console.log("BFS outside-envelope pointers, directional arrows, 3D leader widths and physical raised text passed.");
