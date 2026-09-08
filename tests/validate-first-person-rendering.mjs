import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");

assert.match(source, /const reciprocalDepth = 1 \/ safeDepth;/, "First-person projection must use reciprocal depth.");
assert.match(source, /reciprocalDepth,\s*cameraDepth,/, "Projected vertices must expose reciprocal render depth and raw camera depth.");
const walkModeEntry = source.slice(source.indexOf("if (enabled) {", source.indexOf("setWalkMode =")), source.indexOf("} else {", source.indexOf("setWalkMode =")));
assert.match(
  walkModeEntry,
  /state\.yaw = Math\.atan2\(Math\.sin\(state\.yaw \+ Math\.PI\), Math\.cos\(state\.yaw \+ Math\.PI\)\);/,
  "Entering first person must convert the overview's world rotation into the opposite camera look direction.",
);
assert.match(source, /function firstPersonDistanceToBox\(item\)/, "First-person distance-to-bounds culling is missing.");
assert.match(source, /Math\.max\(margin, 260\)/, "Peripheral first-person objects need a generous screen margin.");
assert.match(source, /renderPerformance\.walkDrawDistance\(\)/, "First-person draw distance must follow the selected quality mode.");
assert.match(source, /base\[3\] < WALK_NEAR_CLIP && top\[3\] < WALK_NEAR_CLIP/, "Columns fully behind the first-person camera must be culled.");

function projectPoint({ x, y, z, yaw = 0, pitch = 0, width = 1000, height = 600, fov = 72 }) {
  const cosineYaw = Math.cos(yaw);
  const sineYaw = Math.sin(yaw);
  const cameraX = -x * cosineYaw + z * sineYaw;
  const forward = x * sineYaw + z * cosineYaw;
  const cosinePitch = Math.cos(pitch);
  const sinePitch = Math.sin(pitch);
  const cameraVertical = y * cosinePitch - forward * sinePitch;
  const cameraDepth = forward * cosinePitch + y * sinePitch;
  const safeDepth = Math.max(0.18, cameraDepth);
  const focalLength = height / (2 * Math.tan((fov * Math.PI / 180) / 2));
  return {
    sx: width / 2 + cameraX * focalLength / safeDepth,
    sy: height / 2 - cameraVertical * focalLength / safeDepth,
    depth: 1 / safeDepth,
    cameraDepth,
  };
}

const near = projectPoint({ x: 0, y: 0, z: 2 });
const far = projectPoint({ x: 0, y: 0, z: 20 });
assert.ok(near.depth > far.depth, "Near geometry must have a larger depth metric than far geometry.");
assert.ok(projectPoint({ x: -2, y: 0, z: 10 }).sx > 500, "The corrected camera-right axis must appear on screen-right.");
assert.ok(projectPoint({ x: 2, y: 0, z: 10 }).sx < 500, "The corrected camera-left axis must appear on screen-left.");

const orbitYaw = -0.72;
const walkYaw = Math.atan2(Math.sin(orbitYaw + Math.PI), Math.cos(orbitYaw + Math.PI));
const orbitViewDirection = [-Math.sin(orbitYaw), -Math.cos(orbitYaw)];
const walkDirection = [Math.sin(walkYaw), Math.cos(walkYaw)];
assert.ok(Math.abs(orbitViewDirection[0] - walkDirection[0]) < 1e-9);
assert.ok(Math.abs(orbitViewDirection[1] - walkDirection[1]) < 1e-9);
assert.ok(walkYaw >= -Math.PI && walkYaw <= Math.PI, "Converted first-person yaw must stay normalized.");

const orbitScreenRight = [Math.cos(orbitYaw), -Math.sin(orbitYaw)];
const walkScreenRight = [-Math.cos(walkYaw), Math.sin(walkYaw)];
assert.ok(Math.abs(orbitScreenRight[0] - walkScreenRight[0]) < 1e-9, "First-person X must not mirror the Overview X axis.");
assert.ok(Math.abs(orbitScreenRight[1] - walkScreenRight[1]) < 1e-9, "First-person Z must not mirror the Overview X axis.");
const rightSidePoint = projectPoint({
  x: walkDirection[0] * 20 + walkScreenRight[0] * 3,
  y: 0,
  z: walkDirection[1] * 20 + walkScreenRight[1] * 3,
  yaw: walkYaw,
});
assert.ok(rightSidePoint.sx > 500, "A point on the Overview's right must remain on the right in first person.");

console.log("First-person rendering validation passed.");
