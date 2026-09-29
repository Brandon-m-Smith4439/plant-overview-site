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
const applyProcessConnectionField = new Function("clamp", `${helperSource}\nreturn applyProcessConnectionField;`)(clamp);

const connection = {
  key: "cutting->polisher",
  fromKey: "cutting",
  toKey: "polisher",
  startAnchorXPercent: 50,
  startAnchorYPercent: 100,
  startAnchorZPercent: 50,
  endAnchorXPercent: 50,
  endAnchorYPercent: 100,
  endAnchorZPercent: 50,
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

assert.equal(connection.startAnchorXPercent, 18);
assert.equal(connection.endAnchorZPercent, 82);
assert.equal(connection.color, "#123456");
assert.equal(connection.width, 4.25);
assert.equal(connection.shape, "elbow");
assert.equal(connection.endStyle, "ring");
assert.deepEqual(machineLabel, labelBefore, "Editing Cutting → Polisher must not change any machine-label pointer property.");

assert.equal(applyProcessConnectionField(connection, "startAnchorXPercent", "999"), true);
assert.equal(connection.startAnchorXPercent, 100, "Connection anchors must clamp to valid bounds.");
assert.equal(applyProcessConnectionField(connection, "labelAnchorXPercent", "5"), false, "Connection editor must reject machine-label fields.");
assert.equal(applyProcessConnectionField(connection, "labelLineColor", "#000000"), false, "Connection editor must reject machine-label line styling.");

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
assert.ok(!renderBody.includes("machine.labelAnchor"));
assert.ok(!renderBody.includes("machine.processPointerAnchor"));

console.log("Runtime process-connection isolation checks passed: connection edits leave machine-label pointers untouched.");
