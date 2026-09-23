import assert from "node:assert/strict";
import fs from "node:fs";

const loader = fs.readFileSync("app/legacy-script-loader.tsx", "utf8");
const studioPage = fs.readFileSync("app/machine-studio/page.tsx", "utf8");
const staticStudio = fs.readFileSync("public/machine-studio.html", "utf8");
const studio = fs.readFileSync("public/machine-design-studio.js", "utf8");
const plant = fs.readFileSync("public/plant-app.js", "utf8");
const geometryPrep = fs.readFileSync("public/geometry-prep-client.js", "utf8");
const firstPerson = fs.readFileSync("public/first-person-controller.js", "utf8");
const renderPerformance = fs.readFileSync("public/render-performance.js", "utf8");
const retainedRenderer = fs.readFileSync("public/three-depth-scene-renderer.js", "utf8");

assert.match(loader, /plantlegacyteardown/, "Route cleanup must notify the outgoing legacy editor.");
assert.match(loader, /scriptLoads\.delete\(entrySource\)/, "The route bootstrap must be reloadable when returning to a page.");
assert.match(loader, /if \(event\.persisted\) teardownEntry\(\)/, "Back-forward cached routes must release their outgoing WebGL viewport.");
assert.match(loader, /if \(event\.persisted\) window\.location\.reload\(\)/, "A released cached route must restart cleanly when revisited.");
assert.match(plant, /cancelAnimationFrame\(animationFrameId\)/, "Plant teardown must stop its animation loop.");
assert.match(plant, /depthRenderer\.dispose\?\.\(\)/, "Plant teardown must release retained GPU resources.");
assert.match(plant, /renderPerformance\.dispose\?\.\(\)/, "Plant teardown must release its shared performance controller.");
assert.match(plant, /removeLifecycleListeners\(\)/, "Plant teardown must remove route-scoped global listeners.");
assert.match(studio, /cancelAnimationFrame\(animationFrameId\)/, "Designer teardown must stop its animation loop.");
assert.match(studio, /depthRenderer\.dispose\?\.\(\)/, "Designer teardown must release retained GPU resources.");
assert.match(studio, /renderPerformance\.dispose\?\.\(\)/, "Designer teardown must release its shared performance controller.");
assert.match(studio, /removeLifecycleListeners\(\)/, "Designer teardown must remove route-scoped global listeners.");
assert.match(renderPerformance, /function dispose\(\)/, "Shared performance controllers must provide route cleanup.");
assert.match(retainedRenderer, /forceContextLoss\?\.\(\)/, "Retired route renderers must return their WebGL context immediately.");
assert.match(plant, /function prepareLayoutDesignLibrary[\s\S]*machine\.designId && designLibrary\[machine\.designId\]/, "Layout startup must prepare only designs used by placed machines.");
assert.match(geometryPrep, /Promise\.allSettled\(designs\.map\(\(design\) => prepareDesign\(design, \{ notify: false \}\)\)\)/, "Library geometry preparation must suppress per-design redraw storms.");
assert.match(geometryPrep, /detail: \{ batch: true, count: designs\.length \}/, "Prepared libraries must emit one batched completion event.");

for (const markup of [studioPage, staticStudio]) {
  assert.match(markup, /id="design-envelope-piece"/, "Designer must expose an envelope-piece picker.");
  assert.match(markup, /id="add-design-envelope-piece"/, "Designer must expose an add-envelope-box action.");
  assert.match(markup, /data-design-envelope-field="x"/, "Envelope pieces must expose editable positions.");
  assert.match(markup, /data-design-envelope-field="w"/, "Envelope pieces must expose editable dimensions.");
}
assert.match(studio, /collisionEnvelopes/, "Saved machine designs must preserve multi-piece collision envelopes.");
assert.match(studio, /function baseEnvelopePiece/, "Designer must create editable machine-level envelope boxes.");
assert.match(studio, /designEnvelopePieces\(design\)\.forEach/, "Every shaped envelope box must be visible in the Designer.");
assert.match(plant, /const envelopes = \[\.\.\.shapedEnvelopes\]/, "Machine-level shaped envelopes must participate in collision checks.");
assert.match(plant, /envelopes\.push\(component\.collisionEnvelope\)/, "Part-level collision envelopes must remain additive with machine-level shaped envelopes.");
assert.match(plant, /walkHitboxesForMachine\(first\)/, "Layout overlap checks must use the shaped envelope pieces.");

assert.match(plant, /function machineLabelZoomScale/, "Machine labels must use continuous zoom-responsive sizing.");
assert.match(plant, /Math\.sqrt\(Math\.max\(\.02, state\.zoom\) \/ 1\.2\)/, "Orbit labels must become smaller and larger with zoom.");
assert.match(plant, /ctx\.textAlign = "left"/, "Machine labels must use the revised professional tag appearance.");
assert.match(plant, /ctx\.shadowColor = "rgba\(3,10,13,\.28\)"/, "Machine labels must retain readable separation from detailed equipment.");

assert.match(plant, /const rotationY = Number\.isFinite\(Number\(parent\.rotationY\)\)/, "Built-in child geometry must use the canonical layout rotation.");
assert.match(plant, /const walkLodHistory = new Map\(\)/, "First-person detail changes must retain hysteresis history.");
assert.match(plant, /WALK_DRAW_HYSTERESIS/, "First-person visibility must use a buffered draw distance.");
assert.match(plant, /walkDistanceAlpha/, "Machines must fade smoothly at the walking draw horizon.");
assert.match(plant, /retainedWalkShadow/, "First-person shadow selection must remain stable near its budget boundary.");
assert.match(plant, /machineHasGeometryAnimation\(machine, design\) \|\| machineLodLevel\(rendered\) < 3/, "Moving and distant machines must use stable footprint shadows.");
assert.match(firstPerson, /fallback\?\.catch\?\.\(\(\) => \{\}\)/, "Denied pointer-lock fallback requests must not create unhandled promises.");

console.log("Route handoff, shaped envelopes, adaptive labels, canonical transforms, and first-person stability checks passed.");
