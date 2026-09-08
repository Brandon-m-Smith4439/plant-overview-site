import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const controller = fs.readFileSync(new URL("../public/first-person-controller.js", import.meta.url), "utf8");
const registry = JSON.parse(fs.readFileSync(new URL("../cad/machine_registry.json", import.meta.url), "utf8"));

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist.`);
  const parametersStart = source.indexOf("(", start);
  let parameterDepth = 0;
  let bodyStart = -1;
  for (let index = parametersStart; index < source.length; index += 1) {
    if (source[index] === "(") parameterDepth += 1;
    if (source[index] === ")") parameterDepth -= 1;
    if (parameterDepth === 0) {
      bodyStart = source.indexOf("{", index);
      break;
    }
  }
  assert.notEqual(bodyStart, -1, `Could not find the body of ${name}.`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not read ${name}.`);
}

const productionMachines = registry.machines.map((machine) => ({
  ...machine,
  category: "equipment",
  visible: true,
  // Layout overlap warnings may be disabled without disabling walk hitboxes.
  collisionMode: "ignore",
  reveal: 0,
  retire: 99,
  y: 0,
  rotationY: Number(machine.rotationY ?? machine.rotation) || 0,
}));
const cuttingTable = productionMachines.find((machine) => machine.id === "barefoot-cutting");
assert.ok(cuttingTable, "The canonical cutting table must exist.");
const rotatedMachine = {
  id: "rotated-machine",
  type: "generic",
  category: "equipment",
  visible: true,
  collisionMode: "ignore",
  reveal: 0,
  retire: 99,
  x: 100,
  y: 0,
  z: 100,
  w: 40,
  d: 4,
  h: 8,
  rotationY: 90,
};
const overheadCrane = {
  ...rotatedMachine,
  id: "overhead-crane",
  type: "bridgeCrane",
  x: 200,
  z: 200,
};
const compoundMachine = {
  ...rotatedMachine,
  id: "compound-machine",
  designId: "compound-design",
  x: 100,
  z: 140,
  w: 10,
  d: 10,
  h: 8,
  rotationY: 0,
};
const context = {
  machines: [...productionMachines, rotatedMachine, overheadCrane, compoundMachine],
  cuttingTable,
  state: { walkRadius: 1.2, walkEyeHeight: 5.5 },
  designLibrary: {
    "compound-design": {
      base: { x: 0, y: 0, z: 0, w: 10, h: 8, d: 10 },
      collisionEnvelopes: [
        { id: "main-box", x: 0, y: 0, z: 0, w: 4, h: 8, d: 10 },
        { id: "added-box", x: 4, y: 0, z: 6, w: 6, h: 8, d: 4 },
      ],
      components: [],
    },
  },
  designPlacement: () => ({ scaleX: 1, scaleY: 1, scaleZ: 1 }),
  designLocalPointToWorld: (machine, design, point) => [
    Number(machine.x) + Number(point[0]),
    Number(machine.y) + Number(point[1]),
    Number(machine.z) + Number(point[2]),
  ],
  clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)),
  floorBounds: () => [-300, -300, 300, 300],
  structuralColumns: () => [],
  isColumnHidden: () => false,
  stageAlpha: () => 1,
  isFloorFeatureType: (type) => ["safetyLine", "trench", "floorDrain"].includes(type),
  isAnimationType: (type) => String(type).startsWith("animated"),
  Math,
  Number,
};
vm.runInNewContext([
  functionSource(plant, "machineHasWalkHitbox"),
  functionSource(plant, "walkCollisionCandidates"),
  functionSource(plant, "designCollisionEnvelopes"),
  functionSource(plant, "walkHitboxesForMachine"),
  functionSource(plant, "angleRadians"),
  functionSource(plant, "circleIntersectsMachine"),
  functionSource(plant, "walkCanOccupy"),
  "results = {",
  "  cuttingCenter: walkCanOccupy(cuttingTable.x + cuttingTable.w / 2, cuttingTable.z + cuttingTable.d / 2, 1.2),",
  "  cuttingOutside: walkCanOccupy(cuttingTable.x - 5, cuttingTable.z + cuttingTable.d / 2, 1.2),",
  "  productionCenters: machines.filter((machine) => machine.category === 'equipment' && !['rotated-machine', 'overhead-crane', 'compound-machine'].includes(machine.id)).map((machine) => ({ id: machine.id, canOccupy: walkCanOccupy(machine.x + machine.w / 2, machine.z + machine.d / 2, 1.2) })),",
  "  rotatedLongEnd: walkCanOccupy(120, 118, 1.2),",
  "  craneCenter: walkCanOccupy(220, 202, 1.2),",
  "  compoundMain: walkCanOccupy(102, 145, 0.4),",
  "  compoundAdded: walkCanOccupy(108, 148, 0.4),",
  "  compoundInsideCorner: walkCanOccupy(108, 142, 0.4),",
  "  candidateIds: walkCollisionCandidates().map((machine) => machine.id),",
  "};",
].join("\n"), context);

assert.equal(context.results.cuttingCenter, false, "The cutting-table envelope must block first-person walking.");
assert.equal(context.results.cuttingOutside, true, "Open floor outside the cutting-table envelope must remain walkable.");
const walkThroughProduction = Array.from(context.results.productionCenters).filter((result) => result.canOccupy !== false);
assert.deepEqual(walkThroughProduction, [], `Every canonical production machine envelope must block first-person walking: ${JSON.stringify(walkThroughProduction)}`);
assert.equal(context.results.rotatedLongEnd, false, "A rotated machine's full envelope must block walking at its long end.");
assert.equal(context.results.craneCenter, true, "An overhead crane envelope must remain pass-through so users can walk beneath it.");
assert.equal(context.results.compoundMain, false, "The main box of a compound envelope must continue blocking first-person walking.");
assert.equal(context.results.compoundAdded, false, "Every added compound-envelope box must block first-person walking.");
assert.equal(context.results.compoundInsideCorner, true, "The open inside corner of an L-shaped envelope must remain walkable.");
assert.deepEqual(Array.from(context.results.candidateIds), [...productionMachines.map((machine) => machine.id), "rotated-machine", "compound-machine"]);

const refreshDesignLibrarySource = functionSource(plant, "refreshDesignLibrary");
assert.match(refreshDesignLibrarySource, /invalidateWalkSpatialIndex\(\)/, "Reloading edited envelopes must invalidate the cached first-person collision index.");
const refreshContext = {
  loadDesignLibrary: () => ({ "compound-design": context.designLibrary["compound-design"] }),
  prepareLayoutDesignLibrary: () => { refreshContext.prepared += 1; },
  invalidateWalkSpatialIndex: () => { refreshContext.invalidated += 1; },
  resetWalkRenderHistory: () => { refreshContext.resetHistory += 1; },
  renderPerformance: { invalidate: () => { refreshContext.redrawn += 1; } },
  syncMachineNameToDesign: () => false,
  normalizedDesignScaleMode: () => "preserve",
  syncMachineDimensionsToDesign: () => false,
  persistLayout: () => {},
  prepared: 0,
  invalidated: 0,
  resetHistory: 0,
  redrawn: 0,
};
vm.runInNewContext(`let designLibrary = {}; const machines = []; ${refreshDesignLibrarySource}; refreshDesignLibrary();`, refreshContext);
assert.equal(refreshContext.prepared, 1, "A live design refresh must prepare the replacement geometry.");
assert.equal(refreshContext.invalidated, 1, "A live design refresh must discard the previous collision index.");
assert.equal(refreshContext.resetHistory, 1, "A live design refresh must discard stale first-person render decisions.");
assert.equal(refreshContext.redrawn, 1, "A collision-only design refresh must still redraw the layout.");

const sweepContext = {
  camera: { x: 0, z: 0 },
  canOccupy: (x) => x < 2 || x > 4,
  Math,
};
vm.runInNewContext(`${functionSource(controller, "tryMove")}\nresult = tryMove(camera, 6, 0, 1, true);`, sweepContext);
assert.ok(sweepContext.result.x < 2, "Swept collision must stop before a hitbox instead of tunneling through it.");

console.log("First-person machine envelope collision checks passed.");
