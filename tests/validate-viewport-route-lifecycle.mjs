import assert from "node:assert/strict";
import fs from "node:fs";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const designer = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const retainedRenderer = fs.readFileSync(new URL("../public/three-depth-scene-renderer.js", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../app/legacy-script-loader.tsx", import.meta.url), "utf8");
const accessGate = fs.readFileSync(new URL("../app/editor-access-gate.tsx", import.meta.url), "utf8");
const stableLauncher = fs.readFileSync(new URL("../Start Plant Overview.bat", import.meta.url), "utf8");
const packageJson = fs.readFileSync(new URL("../package.json", import.meta.url), "utf8");
const vinextWindowsPatch = fs.readFileSync(new URL("../scripts/patch-vinext-windows-static-cache.mjs", import.meta.url), "utf8");

for (const [name, source] of [["plant", plant], ["designer", designer]]) {
  assert.match(source, /__MONROE_ACTIVE_VIEWPORT_RUNTIME__/, `${name} must claim the single active viewport runtime`);
  assert.match(source, /previousViewportRuntime\.dispose\(\)/, `${name} must dispose a surviving prior viewport before allocating GPU resources`);
  assert.match(source, /cancelAnimationFrame\(animationFrameId\)/, `${name} teardown must stop its render loop`);
  assert.match(source, /renderPerformance\.dispose\?\.\(\)/, `${name} teardown must remove shared performance listeners`);
  assert.match(source, /depthRenderer\.dispose\?\.\(\)/, `${name} teardown must release its renderer`);
  assert.match(source, /delete window\[VIEWPORT_RUNTIME_KEY\]/, `${name} teardown must release runtime ownership`);
}

assert.doesNotMatch(plant, /window\.open\([^\n]*machine-studio/, "Designer launch paths must not leave a second plant tab and GPU scene running");
assert.match(plant, /navigateAfterPlantRelease\(`\$\{target\}\$\{query\}`\)/, "Editing a selected machine must use the delayed GPU handoff");
assert.match(plant, /navigateAfterPlantRelease\(standalone \? "machine-studio\.html" : "\/machine-studio"\)/, "Creating a machine must use the same safe handoff");
assert.match(designer, /studio-layout-link, \.studio-back-link/, "Designer exit links must release the Designer before loading the plant");
assert.match(designer, /event\.preventDefault\(\)[\s\S]{0,180}teardownMachineDesigner\(\)[\s\S]{0,180}setTimeout\(\(\) => window\.location\.assign\(target\), 120\)/, "Designer exit must yield after renderer disposal before opening the plant");
assert.match(accessGate, /runtime\?\.dispose\?\.\(\)[\s\S]{0,260}setTimeout\(\(\) => window\.location\.assign\(href\), 120\)/, "password-gated navigation must explicitly release the plant and yield before opening Designer");

const linkedDesignStart = designer.indexOf("function linkedDesignId(machine)");
const linkedDesignEnd = designer.indexOf("\n\n  const initialDesignId", linkedDesignStart);
assert.ok(linkedDesignStart >= 0 && linkedDesignEnd > linkedDesignStart, "linked design initializer must be present");
const linkedDesign = designer.slice(linkedDesignStart, linkedDesignEnd);
assert.doesNotMatch(linkedDesign, /machine\.designId\s*=/, "merely opening a linked machine must not rewrite its plant assignment");
assert.doesNotMatch(designer, /if \(queryMachine && state\.designId\)[\s\S]{0,220}saveLayout\(\)/, "merely opening Designer must not save a no-op layout mutation");

const forceLoss = retainedRenderer.indexOf("renderer.forceContextLoss?.()");
const rendererDispose = retainedRenderer.indexOf("renderer.dispose()", forceLoss);
assert.ok(forceLoss >= 0 && rendererDispose > forceLoss, "the outgoing GPU context must be lost before the Three renderer is disposed");
assert.match(retainedRenderer, /gl\?\.finish\?\.\(\)/, "queued GPU work must finish before context loss");
assert.match(loader, /plantlegacyteardown/, "route cleanup must dispatch the legacy viewport teardown event");
assert.match(loader, /event\.persisted\) teardownEntry\(\)/, "back-forward cached pages must also release their viewport");
assert.match(loader, /addEventListener\("unload", handleUnload\)/, "heavy WebGL routes must not retain their retired document in desktop back-forward cache");
assert.match(loader, /local-build/, "optimized local serving must bypass stale stable-name script cache entries after a rebuild");
assert.match(stableLauncher, /npm\.cmd run build/, "the normal local launcher must build optimized output");
assert.match(stableLauncher, /vinext\.cmd" start/, "the normal local launcher must use the production-equivalent server");
assert.doesNotMatch(stableLauncher, /vinext\.cmd" dev/, "the normal local launcher must not keep the development runtime in the performance path");
assert.match(packageJson, /patch-vinext-windows-static-cache\.mjs && vinext build/, "every optimized build must repair vinext Windows asset paths before starting");
assert.match(vinextWindowsPatch, /split\(path\.sep\)\.join\("\/"\)/, "the local production server cache must use URL separators on Windows");

console.log("Designer-to-layout lifecycle, optimized launcher, and GPU teardown checks passed.");
