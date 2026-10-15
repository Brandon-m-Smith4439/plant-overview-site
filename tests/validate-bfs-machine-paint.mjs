import assert from "node:assert/strict";
import fs from "node:fs";
const app = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
for (const field of ["paintColorOverride", "paintOriginalColor", "partColorOverrides"]) {
  assert.ok(app.includes(field + ":"), "Saved layout normalization must preserve " + field);
}
for (const field of ["data-machine-paint-controls", "data-instance-part-color", "data-reset-machine-paint", "data-reset-instance-part"]) {
  assert.ok(app.includes(field), "Color editor is missing " + field);
}
assert.ok(app.includes("window.PLANT_SHARED_WORKSPACE?.schedulePublish?.()"), "Each layout mutation must preserve shared-workspace publishing.");
assert.ok(app.includes("processPointers: state.processPointers"), "Save must retain pointer positions.");
assert.ok(app.includes("processConnections: state.processConnections"), "Save must retain exact route connections.");
assert.ok(app.includes("hasMachinePaintOverrides(rendered)"), "Painted copies must not share cached instances.");
assert.ok(app.includes("machinePaintRevision(rendered)"), "The render cache must invalidate when colors change.");
assert.ok(app.includes("paintDesignComponent(machine, rawComponent)"), "Every custom design part must accept per-instance color.");
assert.ok(css.includes(".instance-part-color-list"), "The part-color controls must be styled.");

const start = app.indexOf("  function hasMachinePaintOverrides(");
const end = app.indexOf("  function drawCustomDesign(", start);
assert.ok(start >= 0 && end > start);
const defaultDesign = {
  id: "machine-blue", components: [
    { id: "frame", name: "Frame", color: "#2080b0", type: "box" },
    { id: "motor", name: "Motor", color: "#777777", type: "box" },
    { id: "glass", name: "Glass", color: "#99ddee", type: "glassPanel" },
  ],
};
const library = { "machine-blue": defaultDesign };
const helpers = new Function("designLibrary","designMachineColor",app.slice(start,end) +
  "\nreturn {hasMachinePaintOverrides,machinePaintRevision,designColorParts,paintDesignComponent,applyMachinePaint,resetMachinePaint};"
)(library, () => "#2080b0");
const machineA = { instanceId:"a", designId:"machine-blue", color:"#2080b0", partColorOverrides:{} };
const machineB = structuredClone(machineA); machineB.instanceId="b";
const frame = defaultDesign.components[0];
assert.equal(helpers.paintDesignComponent(machineA,frame), frame);
helpers.applyMachinePaint(machineA, "#c92d33");
assert.equal(helpers.paintDesignComponent(machineA, frame).color, "#c92d33");
assert.equal(helpers.paintDesignComponent(machineB, frame).color, "#2080b0");
machineA.partColorOverrides.motor="#35ae6a";
assert.equal(helpers.paintDesignComponent(machineA,defaultDesign.components[1]).color, "#35ae6a");
assert.equal(helpers.paintDesignComponent(machineA,defaultDesign.components[0]).color, "#c92d33");
assert.equal(helpers.paintDesignComponent(machineA,{...defaultDesign.components[1],id:"motor-rectangle-3"}).color, "#35ae6a");
assert.equal(defaultDesign.components[1].color, "#777777", "Global reusable designs cannot be mutated.");
assert.notEqual(helpers.machinePaintRevision(machineA),helpers.machinePaintRevision(machineB));
assert.equal(helpers.designColorParts(defaultDesign).length,3);
const saved = JSON.parse(JSON.stringify({ machines: [machineA,machineB], processPointers:{cutting:"a"},processConnections:{"a->b":{x:12}} }));
assert.equal(saved.machines[0].partColorOverrides.motor,"#35ae6a");
assert.equal(saved.processConnections["a->b"].x,12);
helpers.resetMachinePaint(machineA);
assert.equal(machineA.paintColorOverride,"");
assert.deepEqual(machineA.partColorOverrides,{});
assert.equal(machineA.color,"#2080b0");
assert.equal(helpers.paintDesignComponent(machineA,defaultDesign.components[1]).color,"#777777");
assert.equal(machineB.color,"#2080b0");
console.log("BFS instance and per-part color, reset, independent design and saved-pointer regression checks passed.");
