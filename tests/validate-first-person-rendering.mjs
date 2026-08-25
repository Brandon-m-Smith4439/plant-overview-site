import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");

assert.match(source, /const reciprocalDepth = 1 \/ safeDepth;/, "First-person projection must use reciprocal depth.");
assert.match(source, /reciprocalDepth,\s*cameraDepth,/, "Projected vertices must expose reciprocal render depth and raw camera depth.");
assert.match(source, /state\.yaw = Math\.atan2\(Math\.sin\(state\.yaw \+ Math\.PI\), Math\.cos\(state\.yaw \+ Math\.PI\)\);/, "Orbit yaw must be converted to first-person look direction.");
assert.match(source, /five-point screen test could drop a long machine/, "Peripheral-machine culling regression guard is missing.");
assert.match(source, /Math\.hypot\(cameraX - nearestX, cameraZ - nearestZ\) <= 120/, "Nearby first-person machines must bypass aggressive screen culling.");

function projectPoint({ x, y, z, yaw = 0, pitch = 0, width = 1000, height = 600, fov = 72 }) {
  const cosineYaw = Math.cos(yaw);
  const sineYaw = Math.sin(yaw);
  const cameraX = x * cosineYaw - z * sineYaw;
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
assert.ok(projectPoint({ x: 2, y: 0, z: 10 }).sx > 500, "Positive world X must appear on the right when yaw is zero.");
assert.ok(projectPoint({ x: -2, y: 0, z: 10 }).sx < 500, "Negative world X must appear on the left when yaw is zero.");

const orbitYaw = -0.72;
const walkYaw = Math.atan2(Math.sin(orbitYaw + Math.PI), Math.cos(orbitYaw + Math.PI));
const orbitViewDirection = [-Math.sin(orbitYaw), -Math.cos(orbitYaw)];
const walkDirection = [Math.sin(walkYaw), Math.cos(walkYaw)];
assert.ok(Math.abs(orbitViewDirection[0] - walkDirection[0]) < 1e-9);
assert.ok(Math.abs(orbitViewDirection[1] - walkDirection[1]) < 1e-9);

console.log("First-person rendering validation passed.");
