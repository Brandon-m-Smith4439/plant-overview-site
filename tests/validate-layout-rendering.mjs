import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [css, app] = await Promise.all([
  readFile(path.join(root, "app", "globals.css"), "utf8"),
  readFile(path.join(root, "public", "plant-app.js"), "utf8"),
]);

assert.match(
  css,
  /\.model-frame\.editing #plant-canvas,\s*\.model-frame\.editing \.plant-depth-canvas\s*\{\s*width: calc\(100% - var\(--plant-editor-width\)\);/s,
  "Desktop editor must resize both the interaction and WebGL canvases.",
);

assert.match(
  css,
  /@media \(max-width: 760px\)[\s\S]*?\.model-frame\.editing #plant-canvas,\s*\.model-frame\.editing \.plant-depth-canvas\s*\{\s*width: 100%;\s*height: 48%;/s,
  "Mobile editor must give both canvases the same stacked viewport.",
);

for (const assignment of [
  'left: `${left}px`',
  'top: `${top}px`',
  'width: `${rect.width}px`',
  'height: `${rect.height}px`',
]) {
  assert.ok(app.includes(assignment), `Missing scene-canvas synchronization: ${assignment}`);
}

assert.ok(
  app.includes("requestAnimationFrame(updateCanvasSize);"),
  "Opening or closing the editor must schedule an immediate viewport resync.",
);

const columnStart = app.indexOf("function drawColumn(index)");
const columnEnd = app.indexOf("function sceneDepth", columnStart);
assert.ok(columnStart >= 0 && columnEnd > columnStart, "drawColumn function was not found.");
const columnSource = app.slice(columnStart, columnEnd);
assert.equal(
  (columnSource.match(/\bbox\s*\(/g) || []).length,
  1,
  "Pillars must use one closed volume to avoid coplanar cap z-fighting.",
);
assert.ok(columnSource.includes("blendHexColors"), "Pillar paint must be blended on the single volume.");

console.log("Layout-rendering regression checks passed.");
