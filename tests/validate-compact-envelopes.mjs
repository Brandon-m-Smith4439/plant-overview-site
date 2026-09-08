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
assert.match(studio, /drawComponentEnvelopes\(sourceComponents\)/);
assert.match(studio, /collisionEnvelope/);
assert.match(studio, /Some geometry extends outside the envelope/);
assert.match(plant, /w: Math\.max\(0\.01, Number\(machine\.w\)/);
assert.match(plant, /min="0\.01" step="0\.01"/);
for (const source of [html, tsx]) {
  assert.match(source, /id=["']design-base-w["'][^>]*min=["']0\.01["'][^>]*step=["']0\.01["']/);
  assert.match(source, /id=["']envelope-fit-clearance["']/);
  assert.match(source, /id=["']envelope-fit-scope["']/);
  assert.match(source, /id=["']show-design-envelope["']/);
  assert.match(source, /Move (?:&amp;|&) tight fit to parts/);
  assert.match(source, /data-component-envelope-field=["']x["']/);
  assert.match(source, /id=["']fit-component-envelope["']/);
  for (const axis of ["x", "y", "z"]) assert.match(source, new RegExp(`id=["']design-base-${axis}["']`));
}

assert.match(studio, /design\.base\.x = bounds\.minX - clearance/);
assert.doesNotMatch(studio.match(/document\.getElementById\("fit-envelope"\)[\s\S]*?\n  \}\);/)?.[0] || "", /translateComponent\(/, "Tight fit should move the envelope instead of moving machine parts.");
assert.match(plant, /offsetX: .* - base\.x \* scaleX/);
assert.match(plant, /function walkHitboxesForMachine\(machine\)/);

console.log("Compact machine-envelope validation passed.");
