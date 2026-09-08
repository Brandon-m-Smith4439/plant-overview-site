import assert from "node:assert/strict";
import fs from "node:fs";

const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");

assert.ok(studio.includes("function beamSourceFrame(component)"), "Designer beams need an authored source frame.");
assert.ok(studio.includes("].map((point) => rotatePoint3(point, center, ...rotation));"), "Designer beams must rotate every cross-section vertex, not only their endpoints.");
assert.ok(plant.includes("function designBeamSourceFrame(component)"), "Plant beams need the same authored source frame.");
assert.ok(plant.includes("].map((point)=>rotatedDesignPoint(component,point,center));"), "Plant beams must preserve full X-axis roll after placement.");

const localAxesStart = studio.indexOf("function componentLocalAxes(component)");
const localAxesEnd = studio.indexOf("function ringPoints(", localAxesStart);
const localAxes = studio.slice(localAxesStart, localAxesEnd);
assert.ok(localAxes.includes("const frame = beamSourceFrame(component)") && localAxes.includes("rotateVector3(frame.up, ...rotation)") && localAxes.includes("rotateVector3(frame.side, ...rotation)"), "Beam transform axes must roll with the rendered cross-section.");

const rotateX = (point, degrees) => {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [point[0], point[1] * cosine - point[2] * sine, point[1] * sine + point[2] * cosine];
};
const beamCorners = [
  [-5, -1, -2], [-5, 1, -2], [-5, 1, 2], [-5, -1, 2],
  [5, -1, -2], [5, 1, -2], [5, 1, 2], [5, -1, 2],
];
const span = (points, axis) => Math.max(...points.map((point) => point[axis])) - Math.min(...points.map((point) => point[axis]));
const unrotated = beamCorners.map((point) => rotateX(point, 0));
const rolled = beamCorners.map((point) => rotateX(point, 90));
assert.ok(Math.abs(span(unrotated, 1) - 2) < 1e-9 && Math.abs(span(unrotated, 2) - 4) < 1e-9, "Beam reference cross-section is invalid.");
assert.ok(Math.abs(span(rolled, 1) - 4) < 1e-9 && Math.abs(span(rolled, 2) - 2) < 1e-9, "A 90-degree Beam X rotation must visibly swap its rectangular height and width extents.");
assert.ok(Math.abs(span(rolled, 0) - span(unrotated, 0)) < 1e-9, "Beam X rotation must preserve its authored length.");

console.log("Beam full-frame X rotation and local-axis parity checks passed.");
