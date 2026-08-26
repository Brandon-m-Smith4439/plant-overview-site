import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/workspace-transfer.js", import.meta.url), "utf8");
const plant = fs.readFileSync(new URL("../public/plant-app.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const transfer = context.window.PLANT_WORKSPACE_TRANSFER;

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
    this.failKey = null;
  }

  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) {
    if (key === this.failKey) throw new Error("storage full");
    this.values.set(String(key), String(value));
  }
  removeItem(key) { this.values.delete(key); }
}

const sourceStorage = new MemoryStorage({
  "monroe-glass-plant-layout-v6": '{"machines":[{"id":"saved-machine"}]}',
  "monroe-glass-machine-designs-v1": '{"designs":[{"id":"saved-design"}]}',
  "monroe-glass-render-performance-v1": '{"quality":"balanced"}',
  "unrelated-site-key": "do-not-transfer",
});
const payload = transfer.createPayload(sourceStorage, { appVersion: "test", sourceOrigin: "file://preview.html" });
assert.equal(payload.kind, "monroe-glass-plant-workspace");
assert.equal(Object.keys(payload.items).length, 3, "Workspace export should include every Monroe Glass saved section.");
assert.ok(!("unrelated-site-key" in payload.items), "Workspace export must not include unrelated browser data.");

const targetStorage = new MemoryStorage();
const result = transfer.applyPayload(targetStorage, JSON.stringify(payload));
assert.equal(result.appliedKeys.length, 3);
assert.equal(targetStorage.getItem("monroe-glass-plant-layout-v6"), payload.items["monroe-glass-plant-layout-v6"]);
assert.equal(targetStorage.getItem("monroe-glass-machine-designs-v1"), payload.items["monroe-glass-machine-designs-v1"]);
assert.equal(targetStorage.getItem("monroe-glass-render-performance-v1"), payload.items["monroe-glass-render-performance-v1"]);

assert.throws(
  () => transfer.validatePayload({ kind: "other-project", version: 1, items: { "monroe-glass-test": "value" } }),
  /not a Monroe Glass Plant workspace export/,
  "Imports from another product must be rejected.",
);

const rollbackStorage = new MemoryStorage({ "monroe-glass-a": "old-a" });
rollbackStorage.failKey = "monroe-glass-b";
assert.throws(() => transfer.applyPayload(rollbackStorage, {
  kind: "monroe-glass-plant-workspace",
  version: 1,
  items: { "monroe-glass-a": "new-a", "monroe-glass-b": "new-b" },
}), /storage full/);
assert.equal(rollbackStorage.getItem("monroe-glass-a"), "old-a", "A failed import must restore overwritten values.");

for (const token of [
  'data-editor-action="export-workspace"',
  'data-editor-action="import-workspace"',
  "workspaceTransfer.createPayload(localStorage",
  "workspaceTransfer.applyPayload(localStorage",
]) {
  assert.ok(plant.includes(token), `Plant Project tools are missing workspace transfer behavior: ${token}`);
}

console.log("Full workspace export, import, validation, and rollback checks passed.");
