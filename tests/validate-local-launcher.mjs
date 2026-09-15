import assert from "node:assert/strict";
import fs from "node:fs";

const launcher = fs.readFileSync(new URL("../Start Plant Overview.bat", import.meta.url), "utf8");
const readme = fs.readFileSync(new URL("../README.md", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const performance = fs.readFileSync(new URL("../public/render-performance.js", import.meta.url), "utf8");
const packageJson = fs.readFileSync(new URL("../package.json", import.meta.url), "utf8");

assert.ok(launcher.includes('set "PLANT_HOST=127.0.0.1"'), "Local launcher must remain loopback-only.");
assert.ok(launcher.includes('set "PLANT_PORT=4173"'), "Local launcher must reuse the standalone preview origin.");
assert.ok(readme.includes("`http://127.0.0.1:4173`"), "Run instructions must document the saved-work origin.");
assert.ok(launcher.includes("npm.cmd run build"), "The single local launcher must build optimized output.");
assert.ok(launcher.includes('vinext.cmd" start'), "The single local launcher must start the optimized server.");
assert.ok(!launcher.includes('vinext.cmd" dev'), "The single local launcher must not use the slow development runtime.");
assert.match(packageJson, /patch-vinext-windows-static-cache\.mjs && vinext build/, "Optimized builds must include the Windows asset compatibility fix.");

for (const key of [
  "monroe-glass-plant-layout-v6",
  "monroe-glass-plant-layout-v6-backup",
  "monroe-glass-machine-designs-v1",
]) {
  assert.ok(plant.includes(key) || studio.includes(key), `Saved workspace key ${key} must remain available.`);
}
assert.ok(performance.includes("monroe-glass-render-performance-v1"), "Rendering preferences must retain their storage key.");

console.log("Local launcher origin and saved-work compatibility validation passed.");
