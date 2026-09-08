import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../public/machine-design-studio.js", import.meta.url), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Unable to locate ${name}.`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unable to extract ${name}.`);
}

for (const name of [
  "designComponentCenter",
  "designComponentPoints",
  "designGroupCenter",
  "rotateDesignComponentAround",
  "scaleDesignComponentAround",
  "applyDesignTimelineAnimation",
  "designLocalPointToWorld",
  "drawDesignBox",
]) {
  assert.ok(plant.includes(`function ${name}(`), `Missing ${name}.`);
}

const centerFunction = extractFunction(plant, "designComponentCenter");
assert.match(centerFunction, /component\.type === "wheel"|return \[Number\(component\.x\), Number\(component\.y\), Number\(component\.z\)\]/);
assert.match(centerFunction, /component\.type === "rollerBed"/);

const pointsFunction = extractFunction(plant, "designComponentPoints");
for (const type of ["cylinder", "cone", "sphere", "wedge", "rollerBed", "wheel"]) {
  assert.ok(pointsFunction.includes(`component.type === "${type}"`) || pointsFunction.includes(`component.type === "cylinder" || component.type === "cone"`), `Exact Plant Overview bounds are missing for ${type}.`);
}
assert.match(pointsFunction, /designBeamVertices/);

const applyTimelineFunction = extractFunction(plant, "applyDesignTimelineAnimation");
assert.match(applyTimelineFunction, /\["x", "y", "z"\]\.forEach/);
assert.match(applyTimelineFunction, /const scalePivot = designGroupCenter\(\[animated\]\)/);

const drawCustomDesign = extractFunction(plant, "drawCustomDesign");
assert.match(drawCustomDesign, /drawDesignBox\(machine, component, design, componentAlpha, grow\)/);
assert.doesNotMatch(drawCustomDesign, /box\(scaledComponentBox\(machine, component, design\)/);
assert.match(drawCustomDesign, /drawCylinder3d\(\{/);
assert.match(drawCustomDesign, /designRollerFrame\(component, index, count\)/);

const drawDesignWheel = extractFunction(plant, "drawDesignWheel");
assert.match(drawDesignWheel, /designLocalPointToWorld\(machine, design/);
assert.doesNotMatch(drawDesignWheel, /radiusX[^;]*placement\.scaleX/);

const commonRuntime = [
  "const clone = (value) => JSON.parse(JSON.stringify(value));",
  "const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));",
  "const renderPerformance = { cylinderSegments: (requested = 20) => Math.max(8, Math.round(Number(requested) || 20)) };",
].join("\n");

const plantRuntimeSource = [
  commonRuntime,
  extractFunction(plant, "rotateVector3"),
  extractFunction(plant, "designComponentRotation"),
  extractFunction(plant, "rotatedDesignPoint"),
  extractFunction(plant, "designComponentCenter"),
  extractFunction(plant, "designBeamSourceFrame"),
  extractFunction(plant, "designRollerFrame"),
  extractFunction(plant, "designComponentPoints"),
  extractFunction(plant, "designGroupCenter"),
  extractFunction(plant, "designBeamVertices"),
  extractFunction(plant, "translateDesignComponent"),
  extractFunction(plant, "rotateDesignComponentAround"),
  extractFunction(plant, "scaleDesignComponentAround"),
  extractFunction(plant, "scaleDesignSelectionTogether"),
  extractFunction(plant, "multiplyDesignOpacity"),
  extractFunction(plant, "timelineRotationOperations"),
  extractFunction(plant, "applyDesignTimelineAnimation"),
  extractFunction(plant, "applyInheritedDesignTransform"),
  "({ designComponentCenter, designComponentPoints, designRollerFrame, designGroupCenter, rotateDesignComponentAround, scaleDesignComponentAround, applyDesignTimelineAnimation, applyInheritedDesignTransform })",
].join("\n");
const plantApi = vm.runInNewContext(plantRuntimeSource);

// Preserve the exact wheel-center semantics that originally exposed the Plant
// Overview animation offset.
const wheel = {
  type: "wheel",
  x: 10,
  y: 0,
  z: 0,
  w: 2,
  h: 2,
  d: 1,
  size: 2,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
};
plantApi.rotateDesignComponentAround(wheel, [0,0,0], 0, 0, 90);
assert.ok(Math.abs(wheel.x) < 1e-9, "Wheel rotation did not preserve center-based X semantics.");
assert.ok(Math.abs(wheel.y - 10) < 1e-9, "Wheel rotation did not rotate the wheel center around the pivot.");
assert.ok(Math.abs(wheel.z) < 1e-9, "Wheel rotation unexpectedly moved Z.");

const scaledWheel = {
  type: "wheel",
  x: 5,
  y: 2,
  z: 3,
  w: 2,
  h: 4,
  d: 1,
  size: 4,
};
plantApi.scaleDesignComponentAround(scaledWheel, [0,0,0], 2, 2, 2);
assert.deepEqual(
  [scaledWheel.x, scaledWheel.y, scaledWheel.z].map((value) => Number(value.toFixed(6))),
  [10,4,6],
  "Wheel scale did not move its center relative to the animation pivot.",
);
assert.deepEqual(
  [scaledWheel.w, scaledWheel.h, scaledWheel.d].map((value) => Number(value.toFixed(6))),
  [4,8,2],
  "Wheel scale did not resize around its own center.",
);

// Designer X scaling changes a beam's authored length along the beam direction;
// it must not stretch only the world-X coordinates in Plant Overview.
const diagonalBeam = {
  type: "beam",
  x: 0,
  y: 0,
  z: 0,
  x2: 10,
  y2: 10,
  z2: 0,
  thickness: 2,
  thicknessY: 2,
  thicknessZ: 2,
};
plantApi.scaleDesignComponentAround(diagonalBeam, [5,5,0], 2, 1, 1);
assert.deepEqual(
  [diagonalBeam.x, diagonalBeam.y, diagonalBeam.x2, diagonalBeam.y2].map((value) => Number(value.toFixed(6))),
  [-5,-5,15,15],
  "Beam animation scaling no longer matches the Designer's length-axis behavior.",
);

// Compare the actual bounds helper used by each renderer. This catches pivot
// drift for nested merged groups containing rotated non-box geometry.
const studioRuntimeSource = [
  commonRuntime,
  extractFunction(studio, "degreesToRadians"),
  extractFunction(studio, "rotateVector3"),
  extractFunction(studio, "rotatePoint3"),
  extractFunction(studio, "componentRotation"),
  extractFunction(studio, "rotationMatrixFromEuler"),
  extractFunction(studio, "multiplyRotationMatrices"),
  extractFunction(studio, "transposeRotationMatrix"),
  extractFunction(studio, "transformVectorByMatrix"),
  extractFunction(studio, "rotationMatrixForAxis"),
  extractFunction(studio, "setComponentRotationFromMatrix"),
  extractFunction(studio, "componentCenter"),
  extractFunction(studio, "selectionCenter"),
  extractFunction(studio, "selectionBounds"),
  extractFunction(studio, "componentWorldPoints"),
  extractFunction(studio, "boxVertices"),
  extractFunction(studio, "verticalCylinderVertices"),
  extractFunction(studio, "cylinderVertices"),
  extractFunction(studio, "wheelVertices"),
  extractFunction(studio, "wedgeVertices"),
  extractFunction(studio, "beamSourceFrame"),
  extractFunction(studio, "beamVertices"),
  extractFunction(studio, "localAnimationAxisVector"),
  extractFunction(studio, "timelineRotationOperations"),
  extractFunction(studio, "rotateAnimatedComponentAroundPoint"),
  extractFunction(studio, "translateComponent"),
  extractFunction(studio, "rotateComponent"),
  extractFunction(studio, "rotateSelectionByEuler"),
  extractFunction(studio, "rotateComponentTreeAroundPivot"),
  extractFunction(studio, "rotateSelectionTogether"),
  extractFunction(studio, "setComponentRotation"),
  extractFunction(studio, "scaleComponent"),
  extractFunction(studio, "scaleSelectionTogether"),
  extractFunction(studio, "vectorBetween"),
  extractFunction(studio, "pointDistance"),
  extractFunction(studio, "normalizedVector"),
  extractFunction(studio, "multiplyComponentOpacity"),
  extractFunction(studio, "applyTimelineAnimation"),
  extractFunction(studio, "applyInheritedComponentTransform"),
  "({ componentWorldPoints, componentCenter, cylinderVertices, applyTimelineAnimation, applyInheritedComponentTransform })",
].join("\n");
const studioApi = vm.runInNewContext(studioRuntimeSource);

const rollerParitySample = { type:"rollerBed", x:1,y:2,z:3,w:8,d:6,count:7,thickness:1.8,rotationX:17,rotationY:31,rotationZ:12 };
for (let index = 0; index < rollerParitySample.count; index += 1) {
  const localX = rollerParitySample.x + rollerParitySample.w * index / (rollerParitySample.count - 1);
  const designerVertices = studioApi.cylinderVertices(
    rollerParitySample,
    [localX, rollerParitySample.y, rollerParitySample.z + rollerParitySample.d / 2],
    rollerParitySample.thickness / 2,
    rollerParitySample.thickness / 2,
    rollerParitySample.d / 2,
    6,
  );
  const designerCenter = designerVertices.reduce((center, point) => center.map((value, axis) => value + point[axis] / designerVertices.length), [0,0,0]);
  const plantFrame = plantApi.designRollerFrame(rollerParitySample, index, rollerParitySample.count);
  plantFrame.center.forEach((value, axis) => assert.ok(Math.abs(value - designerCenter[axis]) < 1e-9, `Roller ${index} center axis ${axis} differs between views.`));
  assert.equal(plantFrame.radius, rollerParitySample.thickness / 2, "Plant roller radius must use the saved Designer diameter.");
  assert.equal(plantFrame.halfDepth, rollerParitySample.d / 2, "Plant roller depth must use the saved Designer depth.");
}

const sampleParts = [
  { type:"box", x:1,y:2,z:3,w:4,h:5,d:6,rotationX:17,rotationY:31,rotationZ:12 },
  { type:"cylinder", x:1,y:2,z:3,w:4,h:5,d:6,rotationX:17,rotationY:31,rotationZ:12,segments:20 },
  { type:"cone", x:1,y:2,z:3,w:4,h:5,d:6,rotationX:17,rotationY:31,rotationZ:12,segments:20 },
  { type:"sphere", x:1,y:2,z:3,w:4,h:5,d:6,rotationX:17,rotationY:31,rotationZ:12 },
  { type:"wedge", x:1,y:2,z:3,w:4,h:5,d:6,rotationX:17,rotationY:31,rotationZ:12 },
  { type:"wheel", x:3,y:4,z:5,w:4,h:5,d:2,size:5,rotationX:17,rotationY:31,rotationZ:12 },
  { type:"rollerBed", x:1,y:2,z:3,w:4,d:6,thickness:1.2,rotationX:17,rotationY:31,rotationZ:12 },
  { type:"beam", x:1,y:2,z:3,x2:8,y2:7,z2:6,thickness:2,thicknessY:2.5,thicknessZ:1.5,rotationX:17,rotationY:31,rotationZ:12 },
];

function bounds(points) {
  return points.reduce((result, point) => ({
    minX: Math.min(result.minX, point[0]), maxX: Math.max(result.maxX, point[0]),
    minY: Math.min(result.minY, point[1]), maxY: Math.max(result.maxY, point[1]),
    minZ: Math.min(result.minZ, point[2]), maxZ: Math.max(result.maxZ, point[2]),
  }), { minX:Infinity, maxX:-Infinity, minY:Infinity, maxY:-Infinity, minZ:Infinity, maxZ:-Infinity });
}

for (const component of sampleParts) {
  const designerBounds = bounds(studioApi.componentWorldPoints(component));
  const plantBounds = bounds(plantApi.designComponentPoints(component));
  for (const key of Object.keys(designerBounds)) {
    assert.ok(
      Math.abs(designerBounds[key] - plantBounds[key]) < 1e-9,
      `${component.type} ${key} differs between Designer and Plant Overview.`,
    );
  }
}

const nestedGroup = { type:"group", children:sampleParts };
const designerCenter = studioApi.componentCenter(nestedGroup);
const plantCenter = plantApi.designComponentCenter(nestedGroup);
assert.deepEqual(
  Array.from(plantCenter, (value) => Number(value.toFixed(9))),
  Array.from(designerCenter, (value) => Number(value.toFixed(9))),
  "Nested merged-item animation centers differ between Designer and Plant Overview.",
);

// Compare complete timeline transforms rather than only individual helpers. This
// catches ordering bugs where Plant Overview has the right values but applies
// rotate/translate/scale in a different sequence than Machine Design Studio.
const timelineState = {
  translation: [2,-1,4],
  rotation: [0,0,0],
  rotationOperations: [{ rotation:[20,-35,45], pivotOffset:[3,-2,1] }],
  scale: [1.2,.7,1.5],
  opacity: .4,
  visible: false,
};
const transformSamples = [
  { type:"box", x:2,y:3,z:4,w:4,h:5,d:6,opacity:.8,rotationX:10,rotationY:20,rotationZ:30 },
  { type:"wheel", x:2,y:3,z:4,w:4,h:5,d:2,size:5,opacity:.8,rotationX:10,rotationY:20,rotationZ:30 },
  { type:"beam", x:1,y:2,z:3,x2:8,y2:7,z2:6,thickness:2,thicknessY:2.5,thicknessZ:1.5,opacity:.8,rotationX:10,rotationY:20,rotationZ:30 },
  { type:"group", children:[
    { type:"box", x:1,y:2,z:3,w:4,h:5,d:6,opacity:.8,rotationX:10,rotationY:20,rotationZ:30 },
    { type:"wheel", x:8,y:3,z:5,w:4,h:5,d:2,size:5,opacity:.8,rotationX:10,rotationY:20,rotationZ:30 },
  ] },
];

function effectiveLeafOpacities(component, parentOpacity = 1) {
  const opacity = parentOpacity * Number(component.opacity ?? 1);
  if (component.type === "group") {
    return (component.children || []).flatMap((child) => effectiveLeafOpacities(child, opacity));
  }
  return [opacity];
}

for (const source of transformSamples) {
  const designerAnimated = structuredClone(source);
  const plantAnimated = structuredClone(source);
  studioApi.applyTimelineAnimation(designerAnimated, source, timelineState);
  plantApi.applyDesignTimelineAnimation(plantAnimated, source, timelineState);

  const designerBounds = bounds(studioApi.componentWorldPoints(designerAnimated));
  const plantBounds = bounds(plantApi.designComponentPoints(plantAnimated));
  for (const key of Object.keys(designerBounds)) {
    assert.ok(
      Math.abs(designerBounds[key] - plantBounds[key]) < 1e-9,
      `${source.type} timeline ${key} differs between Designer and Plant Overview.`,
    );
  }
  assert.deepEqual(
    Array.from(effectiveLeafOpacities(plantAnimated), (value) => Number(value.toFixed(9))),
    Array.from(effectiveLeafOpacities(designerAnimated), (value) => Number(value.toFixed(9))),
    `${source.type} timeline opacity differs between Designer and Plant Overview.`,
  );
  assert.equal(plantAnimated.visible, designerAnimated.visible, `${source.type} timeline visibility differs.`);
}

// Motion-driver inheritance is a separate path used by nested merged items. In
// particular, nested groups must scale around their own center before their
// center is moved relative to the driver's pivot.
const inheritedTransform = {
  translation: [2,-1,4],
  rotation: [20,-35,45],
  rotationOperations: [
    { rotation:[20,0,0], pivotOffset:[3,-2,1] },
    { rotation:[0,-35,0], pivotOffset:[3,-2,1] },
    { rotation:[0,0,45], pivotOffset:[3,-2,1] },
  ],
  scale: [1.2,.7,1.5],
  alpha: .4,
  visible: false,
};
const inheritedPivot = [5,4,6];
for (const source of transformSamples) {
  const designerAnimated = studioApi.applyInheritedComponentTransform(structuredClone(source), inheritedTransform, inheritedPivot);
  const plantAnimated = plantApi.applyInheritedDesignTransform(structuredClone(source), inheritedTransform, inheritedPivot);
  const designerBounds = bounds(studioApi.componentWorldPoints(designerAnimated));
  const plantBounds = bounds(plantApi.designComponentPoints(plantAnimated));
  for (const key of Object.keys(designerBounds)) {
    assert.ok(
      Math.abs(designerBounds[key] - plantBounds[key]) < 1e-9,
      `${source.type} inherited ${key} differs between Designer and Plant Overview.`,
    );
  }
  assert.deepEqual(
    Array.from(effectiveLeafOpacities(plantAnimated), (value) => Number(value.toFixed(9))),
    Array.from(effectiveLeafOpacities(designerAnimated), (value) => Number(value.toFixed(9))),
    `${source.type} inherited opacity differs between Designer and Plant Overview.`,
  );
}

console.log("Plant Overview animation transform parity validation passed.");
