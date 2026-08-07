import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const studio = fs.readFileSync(path.join(root, "public/machine-design-studio.js"), "utf8");
const plant = fs.readFileSync(path.join(root, "public/plant-app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "public/machine-studio.html"), "utf8");
const tsx = fs.readFileSync(path.join(root, "app/machine-studio/page.tsx"), "utf8");

assert.match(studio, /const MIN_DESIGN_ENVELOPE = 0\.01/);
assert.match(studio, /function designGeometryBounds\(design, visibleOnly = false\)/);
assert.match(studio, /clearanceInches \/ 12/);
assert.match(studio, /drawDesignEnvelope\(\)/);
assert.match(studio, /Some geometry extends outside the envelope/);
assert.match(plant, /w: Math\.max\(0\.01, Number\(machine\.w\)/);
assert.match(plant, /min="0\.01" step="0\.01"/);
for (const source of [html, tsx]) {
  assert.match(source, /id=["']design-base-w["'][^>]*min=["']0\.01["'][^>]*step=["']0\.01["']/);
  assert.match(source, /id=["']envelope-fit-clearance["']/);
  assert.match(source, /id=["']envelope-fit-scope["']/);
  assert.match(source, /id=["']show-design-envelope["']/);
  assert.match(source, /Tight fit to parts/);
}

console.log("Compact machine-envelope validation passed.");
