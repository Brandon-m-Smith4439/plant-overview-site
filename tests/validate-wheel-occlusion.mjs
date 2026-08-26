import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [app, renderer, studio] = await Promise.all([
  readFile(path.join(root, "public", "plant-app.js"), "utf8"),
  readFile(path.join(root, "public", "depth-scene-renderer.js"), "utf8"),
  readFile(path.join(root, "public", "machine-design-studio.js"), "utf8"),
]);

function functionSource(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `${name} function was not found.`);
  return source.slice(start, end);
}

const cylinder = functionSource(app, "drawCylinder3d", "line3d");
assert.ok(cylinder.includes("polygon("), "3D wheels must submit closed polygon geometry.");
assert.ok(cylinder.includes("front") && cylinder.includes("back"), "Wheel cylinders must include both end caps.");
assert.ok(cylinder.includes("pointFromLocal"), "Wheel geometry must preserve local component and machine rotation.");

const designWheel = functionSource(app, "drawDesignWheel", "designComponentRotation");
assert.ok(designWheel.includes("drawCylinder3d"), "Custom-design wheels must use the depth-rendered cylinder path.");
assert.ok(designWheel.includes("designLocalPointToWorld"), "Custom-design wheels must rotate in design space before sharing the machine's full 3D transform.");
assert.ok(!designWheel.includes("ctx.ellipse"), "Custom-design wheels must not be painted on the 2D overlay.");

assert.equal((app.match(/ctx\.ellipse/g) || []).length, 0, "No plant wheel may bypass the depth buffer through a 2D ellipse.");
assert.match(
  app,
  /machine\.type === "aFrame" \|\| machine\.type === "aFrameTruck"[\s\S]*?drawCylinder3d\(/,
  "A-frame cart and truck wheels must use the depth-rendered cylinder path.",
);

assert.ok(renderer.includes("gl.enable(gl.DEPTH_TEST)"), "The scene renderer must keep depth testing enabled.");
assert.ok(renderer.includes("gl.depthMask(true)") && renderer.includes("drawVertices(packedOpaque, gl.TRIANGLES)"), "Opaque wheel and machine geometry must write to the shared depth buffer.");
assert.ok(studio.includes("buildWheelPrimitives") && studio.includes("buildCylinderPrimitives"), "Design Studio wheels must remain closed 3D cylinder geometry.");

console.log("Wheel occlusion regression checks passed.");
