import assert from "node:assert/strict";
import fs from "node:fs";

const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/machine-studio/page.tsx", import.meta.url), "utf8");
const preview = fs.readFileSync(new URL("../public/machine-studio.html", import.meta.url), "utf8");

assert.ok(studio.includes("deletedDesignIds: [...deletedDesignIds]"), "Deleted library designs must persist across reloads.");
assert.ok(studio.includes("deletedDesignIds.add(id)") && !studio.includes("Built-in presets cannot be deleted."), "Preset and custom machine rows must both be removable.");
assert.ok(studio.includes('data-delete-design-id="${escapeHtml(design.id)}"'), "Each machine-library row needs a delete control.");

assert.match(studio, /function selectComponent\([\s\S]*?commitActiveInspectorEdit\(\);[\s\S]*?state\.componentId = id;/, "Designer fields must commit before component selection changes.");
assert.match(plant, /function setSingleSelection\(instanceId\) \{\s*commitActiveLayoutEditorEdit\(\);[\s\S]*?state\.selectedMachineId =/, "Layout fields must commit before machine selection changes.");

for (const axis of ["x", "y", "z"]) {
  assert.ok(page.includes(`data-mirror-component="${axis}"`), `Designer page is missing Mirror ${axis.toUpperCase()}.`);
  assert.ok(preview.includes(`data-mirror-component="${axis}"`), `Static Designer preview is missing Mirror ${axis.toUpperCase()}.`);
}
assert.ok(studio.includes("function mirrorComponentTree") && studio.includes("mirrorPointAcrossAxis"), "Mirroring must transform full component trees and positions.");
assert.ok(studio.includes("[component.x2, component.y2, component.z2] = end"), "Beam endpoints must mirror with the beam.");
assert.ok(studio.includes("multiplyRotationMatrices(reflection, originalRotation)"), "Mirrored orientations must remain valid right-handed rotations.");

assert.ok(studio.includes("const MAX_PAN_POINTER_DELTA = 160") && !studio.includes("PAN_AXIS_LOCK_RATIO"), "Designer pan must preserve ordinary low-frequency mouse movement without axis-lock jumps.");
assert.ok(plant.includes("Math.max(Math.sin(.62), Math.abs(rawSin))"), "Layout pan must stay stable at shallow camera pitches.");

console.log("Machine deletion, selection isolation, mirroring, and stable pan checks passed.");
