import assert from "node:assert/strict";
import fs from "node:fs";

const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");

const extractFunction = (name) => {
  const start = studio.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is missing.`);
  const bodyStart = studio.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < studio.length; index += 1) {
    if (studio[index] === "{") depth += 1;
    else if (studio[index] === "}") {
      depth -= 1;
      if (depth === 0) return studio.slice(start, index + 1);
    }
  }
  throw new Error(`Unable to extract ${name}.`);
};

const treeRotation = extractFunction("rotateComponentTreeAroundPivot");
assert.match(treeRotation, /component\.type === "group"/, "Merged objects must use recursive assembly rotation.");
assert.match(treeRotation, /rotateComponentTreeAroundPivot\(child, originalChildren\[index\], pivot, rotationMatrix\)/, "Every nested merged child must rotate around the same outer pivot.");
assert.match(treeRotation, /transformVectorByMatrix\(rotationMatrix, offset\)/, "Part positions must rotate through the shared assembly matrix.");
assert.match(treeRotation, /multiplyRotationMatrices\(rotationMatrix, originalRotation\)/, "Part orientations must receive the same world rotation instead of independent Euler edits.");

const selectionRotation = extractFunction("rotateSelectionTogether");
assert.match(selectionRotation, /const rotationMatrix = rotationMatrixForAxis\(axis, degrees, rotationVectors\)/, "A selection must build one rotation matrix for the entire transform.");
assert.ok(!selectionRotation.includes("setComponentRotation(component"), "Multi-selection must not rotate each top-level item independently.");

const applyTransform = extractFunction("applyTransform");
assert.match(applyTransform, /rotateSelectionTogether\(targets, drag\.componentsBefore, drag\.pivot, degrees, drag\.handle, drag\.geometry\.vectors\)/, "Gizmo rotation must pass one pivot and axis basis to the assembly transform.");
assert.match(applyTransform, /drag\.selectionAll \|\| targets\[0\]\.type === "group"/, "Merged objects must use rigid rotation even when they are the only selected top-level item.");

const rotateComponent = extractFunction("rotateComponent");
assert.match(rotateComponent, /const source = axis === "x" \? rotationX/, "Ordinary single parts must retain their established rotation behavior.");
assert.match(rotateComponent, /rotateSelectionByEuler\(children, originals/, "Animation-time group rotation must retain the established preview path.");

const rotateSelectedBy = extractFunction("rotateSelectedBy");
assert.match(rotateSelectedBy, /components\.length > 1 \|\| components\[0\]\.type === "group"/, "Rotation buttons must treat a merged item as one rigid assembly.");

const multiply = (first, second) => first.map((row, rowIndex) => row.map((_, columnIndex) => (
  first[rowIndex][0] * second[0][columnIndex]
  + first[rowIndex][1] * second[1][columnIndex]
  + first[rowIndex][2] * second[2][columnIndex]
)));
const transpose = (matrix) => matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));
const transform = (matrix, vector) => matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
const rotationY90 = [[0, 0, -1], [0, 1, 0], [1, 0, 0]];
const firstCenter = transform(rotationY90, [-2, 0, 0]);
const secondCenter = transform(rotationY90, [2, 0, 0]);
assert.deepEqual(firstCenter.map(Math.round), [0, 0, -2], "The first part must orbit the shared pivot.");
assert.deepEqual(secondCenter.map(Math.round), [0, 0, 2], "The second part must orbit the same shared pivot.");
assert.equal(Math.hypot(...firstCenter.map((value, index) => value - secondCenter[index])), 4, "Rigid rotation must preserve spacing between selected parts.");

const firstOrientation = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const secondOrientation = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];
const relativeBefore = multiply(transpose(firstOrientation), secondOrientation);
const relativeAfter = multiply(
  transpose(multiply(rotationY90, firstOrientation)),
  multiply(rotationY90, secondOrientation),
);
assert.deepEqual(relativeAfter, relativeBefore, "Applying one assembly matrix must preserve the parts' relative orientations.");

console.log("Rigid multi-selection and merged-object rotation checks passed.");
