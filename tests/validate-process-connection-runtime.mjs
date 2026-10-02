import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(root, "public", "plant-app.js"), "utf8");

const start = source.indexOf("  function applyProcessConnectionField(connection, field, rawValue) {");
const end = source.indexOf("\n  function animationGroupMembers", start);
assert.ok(start >= 0 && end > start, "Runtime connection field mutator must be present in plant-app.js.");
const helperSource = source.slice(start, end);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const applyProcessConnectionField = new Function("clamp", "PROCESS_CONNECTION_ANCHOR_MIN_PERCENT", "PROCESS_CONNECTION_ANCHOR_MAX_PERCENT", `${helperSource}\nreturn applyProcessConnectionField;`)(clamp, -1000, 1100);

const connection = {
  key: "object:cutting-table->kodiak-polisher",
  sourceId: "cutting-table",
  targetId: "kodiak-polisher",
  fromKey: "cutting",
  toKey: "polisher",
  startAnchorXPercent: 50,
  startAnchorYPercent: 100,
  startAnchorZPercent: 50,
  endAnchorXPercent: 50,
  endAnchorYPercent: 100,
  endAnchorZPercent: 50,
  flowTurn1Progress: 34,
  flowTurn1Offset: 0,
  flowTurn2Progress: 66,
  flowTurn2Offset: 0,
  flowCurvePercent: 68,
  flowFloorHeight: .18,
  flowSpeed: 42,
  flowGlow: 100,
  tagText: "",
  color: "#52b7aa",
  width: 1.65,
  opacity: 100,
  style: "solid",
  shape: "straight",
  endStyle: "arrow",
  endSize: 3.2,
};
const machineLabel = {
  labelAnchorXPercent: 22,
  labelAnchorYPercent: 88,
  labelAnchorZPercent: 64,
  labelLineColor: "#ff00aa",
  labelLineWidth: 7,
  labelScreenOffsetX: 33,
  labelScreenOffsetY: -44,
};
const labelBefore = structuredClone(machineLabel);

assert.equal(applyProcessConnectionField(connection, "startAnchorXPercent", "18"), true);
assert.equal(applyProcessConnectionField(connection, "endAnchorZPercent", "82"), true);
assert.equal(applyProcessConnectionField(connection, "color", "#123456"), true);
assert.equal(applyProcessConnectionField(connection, "width", "4.25"), true);
assert.equal(applyProcessConnectionField(connection, "shape", "elbow"), true);
assert.equal(applyProcessConnectionField(connection, "endStyle", "ring"), true);
assert.equal(applyProcessConnectionField(connection, "tagText", "Cutting to polish inspection"), true);
assert.equal(applyProcessConnectionField(connection, "flowTurn1Offset", "36"), true);
assert.equal(applyProcessConnectionField(connection, "flowCurvePercent", "82"), true);
assert.equal(applyProcessConnectionField(connection, "flowSpeed", "74"), true);

assert.equal(connection.startAnchorXPercent, 18);
assert.equal(connection.endAnchorZPercent, 82);
assert.equal(connection.color, "#123456");
assert.equal(connection.width, 4.25);
assert.equal(connection.shape, "elbow");
assert.equal(connection.endStyle, "ring");
assert.equal(connection.tagText, "Cutting to polish inspection");
assert.equal(connection.flowTurn1Offset, 36);
assert.equal(connection.flowCurvePercent, 82);
assert.equal(connection.flowSpeed, 74);
assert.deepEqual(machineLabel, labelBefore, "Editing an object-to-object process pointer must not change any machine-label pointer property.");

assert.equal(applyProcessConnectionField(connection, "startAnchorXPercent", "9999"), true);
assert.equal(connection.startAnchorXPercent, 1100, "Connection anchors must support endpoints far beyond the object while still clamping to the expanded safety range.");\nassert.equal(applyProcessConnectionField(connection, "endAnchorYPercent", "-9999"), true);\nassert.equal(connection.endAnchorYPercent, -1000, "Connection anchors must support large negative percentages outside the destination object.");
assert.equal(applyProcessConnectionField(connection, "flowTurn2Offset", "900"), true);
assert.equal(connection.flowTurn2Offset, 500, "Floor-route turn offsets must clamp to the extended routing range.");
assert.equal(applyProcessConnectionField(connection, "flowFloorHeight", "0"), true);
assert.equal(connection.flowFloorHeight, 0.02, "Floor routes must remain slightly above the floor plane.");
assert.equal(applyProcessConnectionField(connection, "labelAnchorXPercent", "5"), false, "Connection editor must reject machine-label fields.");
assert.equal(applyProcessConnectionField(connection, "labelLineColor", "#000000"), false, "Connection editor must reject machine-label line styling.");


assert.ok(source.includes('data-process-connection-edit-source'), "Existing pointers must expose an editable source object selector.");
assert.ok(source.includes('data-process-connection-edit-target'), "Existing pointers must expose an editable destination object selector.");
assert.ok(source.includes("processConnectionObjectOptions()"), "Endpoint dropdowns must use all placed objects, not only process-role nodes.");
assert.ok(source.includes("entriesById.get(connection.sourceId)"), "Renderer must resolve arbitrary source objects by exact instance ID.");
assert.ok(source.includes("entriesById.get(connection.targetId)"), "Renderer must resolve arbitrary destination objects by exact instance ID.");

const firstProcessFieldOccurrence = source.indexOf('panel.querySelectorAll("[data-process-connection-field]")');
const handlerStart = source.indexOf('panel.querySelectorAll("[data-process-connection-field]")', firstProcessFieldOccurrence + 1);
const handlerEnd = source.indexOf(`panel.querySelector("[data-editor-action='refresh-labels']")`, handlerStart);
const handlerBody = source.slice(handlerStart, handlerEnd);
assert.ok(handlerBody.includes("applyProcessConnectionField(connection"));
assert.ok(!handlerBody.includes("machine.label"), "Process connection UI handler must never mutate machine-label properties.");
assert.ok(!handlerBody.includes("machine.processPointerAnchor"), "Process connection UI handler must never mutate legacy machine-owned pointer geometry.");

const renderStart = source.indexOf("function flowEntryWorldAnchor");
const renderEnd = source.indexOf("function rectanglesIntersect", renderStart);
const renderBody = source.slice(renderStart, renderEnd);
assert.ok(renderBody.includes("connection.startAnchor" ) || renderBody.includes('connection[`${prefix}Anchor'));
assert.ok(renderBody.includes("connection.color"));
assert.ok(renderBody.includes("connection.tagText"), "Renderer must prefer custom route-tag text when provided.");
assert.ok(!renderBody.includes("machine.labelAnchor"));
assert.ok(!renderBody.includes("machine.processPointerAnchor"));

console.log("Runtime object-to-object process-connection isolation checks passed: connection edits leave machine-label pointers untouched.");

// Execute the real connection endpoint model with a machine, a person, and a rack.
// This proves retargeting is no longer limited to process-role nodes.
const modelStart = source.indexOf("  function processConnectionKey(sourceId, targetId) {");
const modelEnd = source.indexOf("  function loadLayout() {", modelStart);
assert.ok(modelStart >= 0 && modelEnd > modelStart, "Object-to-object process connection model must be present.");
const modelSource = source.slice(modelStart, modelEnd);
const PROCESS_POINTER_FLOW_DEFINITIONS = [
  { key: "cutting", text: "Cutting", order: 0 },
  { key: "polisher", text: "Polisher", order: 1 },
];
const processPointerFlowDefinition = (key) => PROCESS_POINTER_FLOW_DEFINITIONS.find((item) => item.key === key) || null;
const objects = new Map([
  ["cutting-table", { instanceId: "cutting-table", name: "Cutting Table", type: "cutting" }],
  ["kodiak-polisher", { instanceId: "kodiak-polisher", name: "Kodiak Polisher", type: "kodiak" }],
  ["person-1", { instanceId: "person-1", name: "Operator", type: "person" }],
  ["rack-1", { instanceId: "rack-1", name: "Glass Rack 12", type: "glassRack" }],
]);
const objectState = {
  processPointers: { cutting: "cutting-table", polisher: "kodiak-polisher" },
  processConnections: {},
  selectedProcessConnectionKey: "",
};
const model = new Function(
  "state", "PROCESS_POINTER_FLOW_DEFINITIONS", "processPointerFlowDefinition", "machineById", "clamp",
  `${modelSource}\nreturn { processConnectionKey, defaultProcessConnection, normalizeProcessConnections, normalizeProcessConnection, processConnectionRoleForObject };`,
)(objectState, PROCESS_POINTER_FLOW_DEFINITIONS, processPointerFlowDefinition, (id) => objects.get(id) || null, clamp);

const retargetStart = source.indexOf("  function retargetProcessConnection(connection, sourceId, targetId) {");
const retargetEnd = source.indexOf("  function applyProcessConnectionField", retargetStart);
assert.ok(retargetStart >= 0 && retargetEnd > retargetStart, "Retarget helper must be present.");
const retargetSource = source.slice(retargetStart, retargetEnd);
const retargetProcessConnection = new Function(
  "state", "machineById", "processConnectionKey", "normalizeProcessConnection", "processConnectionRoleForObject",
  `${retargetSource}\nreturn retargetProcessConnection;`,
)(objectState, (id) => objects.get(id) || null, model.processConnectionKey, model.normalizeProcessConnection, model.processConnectionRoleForObject);

const migrated = model.normalizeProcessConnections({
  "cutting->polisher": { fromKey: "cutting", toKey: "polisher", width: 2.75 },
}, objectState.processPointers, [...objects.values()]);
const migratedConnection = Object.values(migrated)[0];
assert.equal(migratedConnection.sourceId, "cutting-table", "Legacy Cutting source must migrate to its exact object ID.");
assert.equal(migratedConnection.targetId, "kodiak-polisher", "Legacy Polisher destination must migrate to its exact object ID.");
assert.equal(migratedConnection.width, 2.75, "Legacy connection styling must survive endpoint migration.");

const arbitrary = model.defaultProcessConnection("cutting-table", "kodiak-polisher", { fromKey: "cutting", toKey: "polisher" });
objectState.processConnections[arbitrary.key] = arbitrary;
objectState.selectedProcessConnectionKey = arbitrary.key;
const labelIsolation = structuredClone(machineLabel);
const retargeted = retargetProcessConnection(arbitrary, "person-1", "rack-1");
assert.ok(retargeted, "A process pointer must retarget from a process machine to arbitrary placed objects.");
assert.equal(retargeted.sourceId, "person-1");
assert.equal(retargeted.targetId, "rack-1");
assert.equal(retargeted.fromKey, "", "A person without a process role must not be forced into a process-node key.");
assert.equal(retargeted.toKey, "", "A rack without a process role must not be forced into a process-node key.");
assert.ok(objectState.processConnections[retargeted.key], "Retargeted pointer must be persisted under its new object-to-object key.");
assert.equal(objectState.processConnections[arbitrary.key], undefined, "Old connection key must be removed after retargeting.");
assert.deepEqual(machineLabel, labelIsolation, "Retargeting to a person/rack must not touch machine-label pointer properties.");

console.log("Arbitrary object endpoint runtime checks passed: process pointers can target machines, people, racks, and other placed objects.");
